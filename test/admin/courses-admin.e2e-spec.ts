import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';

const SUPER_ADMIN_ROLE_ID = 3;

describe('Admin / Courses', () => {
  const app = APP_URL;
  const runId = Date.now();

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'Course', lastName: 'Tester' })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password })
      .expect(200);

    return { token: body.token as string, userId: body.user.id as number };
  };

  const createMasterDataCode = async (
    token: string,
    groupKey: string,
    code: string,
    name: string,
  ) => {
    const { body } = await request(app)
      .post(`/api/v1/admin/master-data/groups/${groupKey}/codes`)
      .auth(token, { type: 'bearer' })
      .send({ code, name, displayOrder: 1 })
      .expect(201);

    return body.id as string;
  };

  let superAdminToken: string;
  let plainUserToken: string;
  let levelId: string;
  let categoryId: string;

  beforeAll(async () => {
    const superAdmin = await registerAndLogin(
      `courses-admin.super.${runId}@example.com`,
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

    const plain = await registerAndLogin(
      `courses-admin.plain.${runId}@example.com`,
    );
    plainUserToken = plain.token;

    levelId = await createMasterDataCode(
      superAdminToken,
      'course_level',
      `beginner_${runId}`,
      `Beginner ${runId}`,
    );
    categoryId = await createMasterDataCode(
      superAdminToken,
      'course_category',
      `programming_${runId}`,
      `Programming ${runId}`,
    );
  });

  it('should reject a user with no granted permissions: POST /admin/courses', async () => {
    await request(app)
      .post('/api/v1/admin/courses')
      .auth(plainUserToken, { type: 'bearer' })
      .send({
        title: 'X',
        language: 'en',
        price: 0,
        hasCertificate: false,
        enrollmentOpen: true,
      })
      .expect(403);
  });

  describe('Course lifecycle', () => {
    const title = `Intro to Testing ${runId}`;
    let courseId: string;

    it('should create a course with an auto-generated slug, status=draft, and derived isFree', async () => {
      const { body } = await request(app)
        .post('/api/v1/admin/courses')
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          title,
          language: 'en',
          price: 0,
          hasCertificate: false,
          enrollmentOpen: true,
          levelId,
          categoryId,
        })
        .expect(201);

      expect(body.slug).toBe(`intro-to-testing-${runId}`);
      expect(body.status).toBe('draft');
      expect(body.isFree).toBe(true);
      expect(body.level.id).toBe(levelId);
      expect(body.category.id).toBe(categoryId);
      courseId = body.id;
    });

    it('should append -2 to the slug when the title collides', async () => {
      const { body } = await request(app)
        .post('/api/v1/admin/courses')
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          title,
          language: 'en',
          price: 20,
          hasCertificate: false,
          enrollmentOpen: true,
        })
        .expect(201);

      expect(body.slug.endsWith('-2')).toBe(true);
      expect(body.isFree).toBe(false);
    });

    it('should reject an unknown levelId with 422', async () => {
      await request(app)
        .post('/api/v1/admin/courses')
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          title: `Bad level ${runId}`,
          language: 'en',
          price: 0,
          hasCertificate: false,
          enrollmentOpen: true,
          levelId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(422);
    });

    it('should reject a levelId that actually belongs to course_category (wrong group)', async () => {
      await request(app)
        .post('/api/v1/admin/courses')
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          title: `Wrong group ${runId}`,
          language: 'en',
          price: 0,
          hasCertificate: false,
          enrollmentOpen: true,
          levelId: categoryId,
        })
        .expect(422);
    });

    it('should get the full course detail with nested sections and re-exposed aggregate fields', async () => {
      await request(app)
        .get(`/api/v1/admin/courses/${courseId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.title).toBe(title);
          expect(body.sections).toEqual([]);
          expect(body.learningOutcomes).toEqual([]);
          expect(body.requirements).toEqual([]);
          expect(body.targetLearners).toEqual([]);
          expect(body.groupIds).toEqual([]);
          expect(body.totalSections).toBe(0);
          expect(body.totalLectures).toBe(0);
          expect(body.totalDurationSecs).toBe(0);
        });
    });

    it('should 404 for an unknown course id', async () => {
      await request(app)
        .get('/api/v1/admin/courses/00000000-0000-0000-0000-000000000000')
        .auth(superAdminToken, { type: 'bearer' })
        .expect(404);
    });

    it('should update course fields without regenerating the slug', async () => {
      await request(app)
        .patch(`/api/v1/admin/courses/${courseId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ shortDescription: 'Updated description', price: 15 })
        .expect(200)
        .expect(({ body }) => {
          expect(body.shortDescription).toBe('Updated description');
          expect(body.isFree).toBe(false);
          expect(body.slug).toBe(`intro-to-testing-${runId}`);
        });
    });

    it('should filter the course list by status and levelId', async () => {
      const { body } = await request(app)
        .get(`/api/v1/admin/courses?status=draft&levelId=${levelId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);

      const found = body.data.find((c) => c.id === courseId);
      expect(found).toBeDefined();
      body.data.forEach((c) => {
        expect(c.status).toBe('draft');
      });
    });
  });
});
