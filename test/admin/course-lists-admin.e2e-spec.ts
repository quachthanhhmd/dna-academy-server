import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';

const SUPER_ADMIN_ROLE_ID = 3;

describe('Admin / Course Lists (outcomes, requirements, target learners)', () => {
  const app = APP_URL;
  const runId = Date.now();

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'CL', lastName: 'Tester' })
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
      `course-lists.super.${runId}@example.com`,
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
        title: `Course Lists Test ${runId}`,
        language: 'en',
        price: 0,
        hasCertificate: false,
        enrollmentOpen: true,
      })
      .expect(201);
    courseId = course.id;
  });

  it.each([
    ['outcomes', '/outcomes'],
    ['requirements', '/requirements'],
    ['target-learners', '/target-learners'],
  ])(
    'should replace the %s list, then fully overwrite it on a second call',
    async (_label, path) => {
      const { body: firstSet } = await request(app)
        .put(`/api/v1/admin/courses/${courseId}${path}`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          items: [
            { description: 'First', displayOrder: 1 },
            { description: 'Second', displayOrder: 2 },
          ],
        })
        .expect(200);

      expect(firstSet).toHaveLength(2);
      expect(firstSet.map((i) => i.description)).toEqual(['First', 'Second']);

      const { body: secondSet } = await request(app)
        .put(`/api/v1/admin/courses/${courseId}${path}`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          items: [{ description: 'Replaced entirely', displayOrder: 1 }],
        })
        .expect(200);

      expect(secondSet).toHaveLength(1);
      expect(secondSet[0].description).toBe('Replaced entirely');
    },
  );

  it('should 404 for an unknown course id', async () => {
    await request(app)
      .put(
        '/api/v1/admin/courses/00000000-0000-0000-0000-000000000000/outcomes',
      )
      .auth(superAdminToken, { type: 'bearer' })
      .send({ items: [] })
      .expect(404);
  });

  it('should reflect the replaced outcomes in the course detail response', async () => {
    await request(app)
      .put(`/api/v1/admin/courses/${courseId}/outcomes`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ items: [{ description: 'Detail check', displayOrder: 1 }] })
      .expect(200);

    await request(app)
      .get(`/api/v1/admin/courses/${courseId}`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.learningOutcomes).toHaveLength(1);
        expect(body.learningOutcomes[0].description).toBe('Detail check');
      });
  });
});
