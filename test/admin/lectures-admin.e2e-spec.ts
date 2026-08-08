import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';

const SUPER_ADMIN_ROLE_ID = 3;

describe('Admin / Lectures', () => {
  const app = APP_URL;
  const runId = Date.now();

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'Lec', lastName: 'Tester' })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password })
      .expect(200);

    return { token: body.token as string, userId: body.user.id as number };
  };

  let superAdminToken: string;
  let courseId: string;
  let sectionAId: string;
  let sectionBId: string;

  beforeAll(async () => {
    const superAdmin = await registerAndLogin(
      `lectures-admin.super.${runId}@example.com`,
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
        title: `Lectures Test ${runId}`,
        language: 'en',
        price: 0,
        hasCertificate: false,
        enrollmentOpen: true,
      })
      .expect(201);
    courseId = course.id;

    const { body: sectionA } = await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ title: 'Section A', displayOrder: 1 })
      .expect(201);
    sectionAId = sectionA.id;

    const { body: sectionB } = await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ title: 'Section B', displayOrder: 2 })
      .expect(201);
    sectionBId = sectionB.id;
  });

  it('should reject an invalid lectureType with 422', async () => {
    await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections/${sectionAId}/lectures`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        title: 'Bad',
        lectureType: 'nonsense',
        durationSecs: 1,
        isPreview: false,
        requiresCompletion: false,
        displayOrder: 1,
      })
      .expect(422);
  });

  it('should create lectures (defaulting to status=draft) and recalculate course aggregates', async () => {
    const { body: lecture1 } = await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections/${sectionAId}/lectures`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        title: 'Lecture A1',
        lectureType: 'article',
        durationSecs: 100,
        isPreview: false,
        requiresCompletion: true,
        displayOrder: 1,
      })
      .expect(201);
    expect(lecture1.status).toBe('draft');

    await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections/${sectionAId}/lectures`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        title: 'Lecture A2',
        lectureType: 'video',
        durationSecs: 200,
        isPreview: true,
        requiresCompletion: false,
        displayOrder: 2,
      })
      .expect(201);

    await request(app)
      .get(`/api/v1/admin/courses/${courseId}`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.totalLectures).toBe(2);
        expect(body.totalDurationSecs).toBe(300);
      });
  });

  it('should reorder lectures within a section', async () => {
    const { body: course } = await request(app)
      .get(`/api/v1/admin/courses/${courseId}`)
      .auth(superAdminToken, { type: 'bearer' });
    const sectionA = course.sections.find((s) => s.id === sectionAId);
    const [lecture1, lecture2] = sectionA.lectures;

    await request(app)
      .patch(
        `/api/v1/admin/courses/${courseId}/sections/${sectionAId}/lectures/reorder`,
      )
      .auth(superAdminToken, { type: 'bearer' })
      .send({ orderedIds: [lecture2.id, lecture1.id] })
      .expect(200)
      .expect(({ body }) => {
        expect(body[0].id).toBe(lecture2.id);
        expect(body[0].displayOrder).toBe(1);
      });
  });

  it('should move a lecture to a different section in the same course', async () => {
    const { body: course } = await request(app)
      .get(`/api/v1/admin/courses/${courseId}`)
      .auth(superAdminToken, { type: 'bearer' });
    const sectionA = course.sections.find((s) => s.id === sectionAId);
    const lectureToMove = sectionA.lectures[0];

    await request(app)
      .patch(
        `/api/v1/admin/courses/${courseId}/lectures/${lectureToMove.id}/move`,
      )
      .auth(superAdminToken, { type: 'bearer' })
      .send({ targetSectionId: sectionBId, displayOrder: 1 })
      .expect(200)
      .expect(({ body }) => {
        expect(body.section.id).toBe(sectionBId);
        expect(body.displayOrder).toBe(1);
      });

    await request(app)
      .get(`/api/v1/admin/courses/${courseId}`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        const updatedSectionB = body.sections.find((s) => s.id === sectionBId);
        expect(
          updatedSectionB.lectures.some((l) => l.id === lectureToMove.id),
        ).toBe(true);
      });
  });

  it('should reject moving a lecture into a section from a different course', async () => {
    const { body: otherCourse } = await request(app)
      .post('/api/v1/admin/courses')
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        title: `Other Course ${runId}`,
        language: 'en',
        price: 0,
        hasCertificate: false,
        enrollmentOpen: true,
      })
      .expect(201);

    const { body: otherSection } = await request(app)
      .post(`/api/v1/admin/courses/${otherCourse.id}/sections`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ title: 'Other Section', displayOrder: 1 })
      .expect(201);

    const { body: course } = await request(app)
      .get(`/api/v1/admin/courses/${courseId}`)
      .auth(superAdminToken, { type: 'bearer' });
    const anyLecture = course.sections.flatMap((s) => s.lectures).find(Boolean);

    await request(app)
      .patch(`/api/v1/admin/courses/${courseId}/lectures/${anyLecture.id}/move`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ targetSectionId: otherSection.id, displayOrder: 1 })
      .expect(422);
  });

  it('should delete a lecture and recalculate course aggregates', async () => {
    const { body: course } = await request(app)
      .get(`/api/v1/admin/courses/${courseId}`)
      .auth(superAdminToken, { type: 'bearer' });
    const sectionB = course.sections.find((s) => s.id === sectionBId);
    const lectureToDelete = sectionB.lectures[0];
    const beforeTotal = course.totalLectures;

    await request(app)
      .delete(
        `/api/v1/admin/courses/${courseId}/sections/${sectionBId}/lectures/${lectureToDelete.id}`,
      )
      .auth(superAdminToken, { type: 'bearer' })
      .expect(204);

    await request(app)
      .get(`/api/v1/admin/courses/${courseId}`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.totalLectures).toBe(beforeTotal - 1);
      });
  });
});
