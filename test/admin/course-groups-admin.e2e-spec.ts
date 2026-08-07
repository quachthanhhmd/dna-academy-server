import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';

const SUPER_ADMIN_ROLE_ID = 3;

describe('Admin / Course Groups', () => {
  const app = APP_URL;
  const runId = Date.now();

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'CG', lastName: 'Tester' })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password })
      .expect(200);

    return { token: body.token as string, userId: body.user.id as number };
  };

  let superAdminToken: string;
  let courseId: string;
  let groupCodeAId: string;
  let groupCodeBId: string;
  let wrongGroupCodeId: string;

  beforeAll(async () => {
    const superAdmin = await registerAndLogin(
      `course-groups.super.${runId}@example.com`,
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
        title: `Course Groups Test ${runId}`,
        language: 'en',
        price: 0,
        hasCertificate: false,
        enrollmentOpen: true,
      })
      .expect(201);
    courseId = course.id;

    const { body: codeA } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_group/codes')
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        code: `group_a_${runId}`,
        name: `Group A ${runId}`,
        displayOrder: 1,
      })
      .expect(201);
    groupCodeAId = codeA.id;

    const { body: codeB } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_group/codes')
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        code: `group_b_${runId}`,
        name: `Group B ${runId}`,
        displayOrder: 2,
      })
      .expect(201);
    groupCodeBId = codeB.id;

    const { body: wrongCode } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_level/codes')
      .auth(superAdminToken, { type: 'bearer' })
      .send({ code: `level_${runId}`, name: `Level ${runId}`, displayOrder: 1 })
      .expect(201);
    wrongGroupCodeId = wrongCode.id;
  });

  it('should reject an unknown groupId with 422', async () => {
    await request(app)
      .put(`/api/v1/admin/courses/${courseId}/groups`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ groupIds: ['00000000-0000-0000-0000-000000000000'] })
      .expect(422);
  });

  it('should reject a groupId from the wrong master-data group with 422', async () => {
    await request(app)
      .put(`/api/v1/admin/courses/${courseId}/groups`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ groupIds: [wrongGroupCodeId] })
      .expect(422);
  });

  it('should set course_group assignments and reflect them in course detail', async () => {
    await request(app)
      .put(`/api/v1/admin/courses/${courseId}/groups`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ groupIds: [groupCodeAId, groupCodeBId] })
      .expect(200);

    await request(app)
      .get(`/api/v1/admin/courses/${courseId}`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.groupIds.sort()).toEqual(
          [groupCodeAId, groupCodeBId].sort(),
        );
      });
  });

  it('should replace (not append to) the group set on a second call', async () => {
    await request(app)
      .put(`/api/v1/admin/courses/${courseId}/groups`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ groupIds: [groupCodeAId] })
      .expect(200);

    await request(app)
      .get(`/api/v1/admin/courses/${courseId}`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.groupIds).toEqual([groupCodeAId]);
      });
  });

  it('should 404 for an unknown course id', async () => {
    await request(app)
      .put('/api/v1/admin/courses/00000000-0000-0000-0000-000000000000/groups')
      .auth(superAdminToken, { type: 'bearer' })
      .send({ groupIds: [] })
      .expect(404);
  });
});
