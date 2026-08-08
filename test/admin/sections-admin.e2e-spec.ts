import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';

const SUPER_ADMIN_ROLE_ID = 3;

describe('Admin / Sections', () => {
  const app = APP_URL;
  const runId = Date.now();

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'Sec', lastName: 'Tester' })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password })
      .expect(200);

    return { token: body.token as string, userId: body.user.id as number };
  };

  let superAdminToken: string;
  let courseId: string;

  beforeAll(async () => {
    const superAdmin = await registerAndLogin(
      `sections-admin.super.${runId}@example.com`,
    );
    superAdminToken = superAdmin.token;
    await request(app)
      .post('/api/v1/user-roles')
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        user: { id: superAdmin.userId },
        role: { id: SUPER_ADMIN_ROLE_ID },
      })
      .expect(201);

    const { body: course } = await request(app)
      .post('/api/v1/admin/courses')
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        title: `Sections Test ${runId}`,
        language: 'en',
        price: 0,
        hasCertificate: false,
        enrollmentOpen: true,
      })
      .expect(201);
    courseId = course.id;
  });

  it('should 404 for an unknown course id', async () => {
    await request(app)
      .post(
        '/api/v1/admin/courses/00000000-0000-0000-0000-000000000000/sections',
      )
      .auth(superAdminToken, { type: 'bearer' })
      .send({ title: 'X', displayOrder: 1 })
      .expect(404);
  });

  it('should create sections and recalculate course.totalSections', async () => {
    await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ title: 'Section One', displayOrder: 1 })
      .expect(201);

    await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ title: 'Section Two', displayOrder: 2 })
      .expect(201);

    await request(app)
      .get(`/api/v1/admin/courses/${courseId}`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.totalSections).toBe(2);
        expect(body.sections.map((s) => s.title)).toEqual([
          'Section One',
          'Section Two',
        ]);
      });
  });

  it('should reorder sections and recalculate aggregates', async () => {
    const { body: sections } = await request(app)
      .get(`/api/v1/admin/courses/${courseId}/sections`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200);

    const [first, second] = sections;

    await request(app)
      .patch(`/api/v1/admin/courses/${courseId}/sections/reorder`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ orderedIds: [second.id, first.id] })
      .expect(200);

    await request(app)
      .get(`/api/v1/admin/courses/${courseId}/sections`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body[0].id).toBe(second.id);
        expect(body[0].displayOrder).toBe(1);
        expect(body[1].id).toBe(first.id);
        expect(body[1].displayOrder).toBe(2);
      });
  });

  it('should reject reorder with a mismatched id set', async () => {
    await request(app)
      .patch(`/api/v1/admin/courses/${courseId}/sections/reorder`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ orderedIds: ['00000000-0000-0000-0000-000000000000'] })
      .expect(422);
  });

  it('should update a section', async () => {
    const { body: sections } = await request(app)
      .get(`/api/v1/admin/courses/${courseId}/sections`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200);

    await request(app)
      .patch(`/api/v1/admin/courses/${courseId}/sections/${sections[0].id}`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ description: 'Updated' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.description).toBe('Updated');
        expect(body.title).toBe(sections[0].title);
      });
  });

  it('should 409 SECTION_HAS_LECTURES when deleting a section with lectures unless force=true', async () => {
    const { body: section } = await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ title: 'Section With Lecture', displayOrder: 3 })
      .expect(201);

    // Uses the generic (pre-existing, not-yet-admin-wrapped) /lectures
    // endpoint purely to seed a lecture under this section for the cascade
    // delete check below — the admin lectures endpoints land in a later task.
    await request(app)
      .post('/api/v1/lectures')
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        title: 'A lecture',
        lectureType: 'article',
        status: 'draft',
        durationSecs: 60,
        isPreview: false,
        requiresCompletion: true,
        displayOrder: 1,
        section: { id: section.id },
      })
      .expect(201);

    await request(app)
      .delete(`/api/v1/admin/courses/${courseId}/sections/${section.id}`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({})
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe('SECTION_HAS_LECTURES');
      });

    await request(app)
      .delete(`/api/v1/admin/courses/${courseId}/sections/${section.id}`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ force: true })
      .expect(204);
  });
});
