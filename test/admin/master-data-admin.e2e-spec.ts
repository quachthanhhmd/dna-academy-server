import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { createdIds, deactivateMasterDataCodes } from '../utils/cleanup';
import { loginSeededSuperAdmin, makeSuperAdmin } from '../utils/admin';

describe('Admin / Master Data', () => {
  afterAll(async () => {
    await deactivateMasterDataCodes(
      APP_URL,
      superAdminToken,
      'course_level',
      tracked.all(),
    );
  });

  const app = APP_URL;
  const runId = Date.now();

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'MD', lastName: 'Tester' })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password })
      .expect(200);

    return { token: body.token as string, userId: body.user.id as number };
  };

  let seededAdminToken: string;

  let superAdminToken: string;
  let plainUserToken: string;

  beforeAll(async () => {
    seededAdminToken = await loginSeededSuperAdmin(app);
    const superAdmin = await registerAndLogin(
      `md-admin.super.${runId}@example.com`,
    );
    superAdminToken = superAdmin.token;
    await makeSuperAdmin(app, seededAdminToken, superAdmin.userId);

    const plain = await registerAndLogin(`md-admin.plain.${runId}@example.com`);
    plainUserToken = plain.token;
  });

  // Epic 4.2 §4.1 — every spec used to leave its rows behind. The isolated
  // test stack is the real fix; this is belt and braces for anyone running
  // one file against a longer-lived database.
  const tracked = createdIds();

  it('should list the 7 seeded groups: GET /admin/master-data/groups', async () => {
    await request(app)
      .get('/api/v1/admin/master-data/groups')
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        const keys = body.map((g) => g.groupKey);
        expect(keys).toEqual(
          expect.arrayContaining([
            'course_group',
            'course_level',
            'course_category',
            'lecture_type',
            'course_status',
            'education_stage',
            'career_interest',
          ]),
        );
      });
  });

  it('should reject a user with no granted permissions: GET /admin/master-data/groups', async () => {
    await request(app)
      .get('/api/v1/admin/master-data/groups')
      .auth(plainUserToken, { type: 'bearer' })
      .expect(403);
  });

  it('should 404 for an unknown groupKey: GET /admin/master-data/groups/:groupKey/codes', async () => {
    await request(app)
      .get('/api/v1/admin/master-data/groups/not_a_real_key/codes')
      .auth(superAdminToken, { type: 'bearer' })
      .expect(404);
  });

  describe('Codes within course_level', () => {
    const codeName = `Beginner ${runId}`;
    let codeId: string;

    it('should create a code: POST /admin/master-data/groups/course_level/codes', async () => {
      const { body } = await request(app)
        .post('/api/v1/admin/master-data/groups/course_level/codes')
        .auth(superAdminToken, { type: 'bearer' })
        .send({ code: `beginner_${runId}`, name: codeName, displayOrder: 1 })
        .expect(201);

      tracked.track(body);

      expect(body.isActive).toBe(true);
      expect(body.group.groupKey).toBe('course_level');
      codeId = body.id;
    });

    it('should reject a duplicate (group, name) with 409', async () => {
      await request(app)
        .post('/api/v1/admin/master-data/groups/course_level/codes')
        .auth(superAdminToken, { type: 'bearer' })
        .send({ code: `beginner-dup-${runId}`, name: codeName })
        .expect(409);
    });

    it('should list the code with linkedCoursesCount: GET .../codes', async () => {
      await request(app)
        .get('/api/v1/admin/master-data/groups/course_level/codes')
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          const created = body.find((c) => c.id === codeId);
          expect(created).toBeDefined();
          expect(created.linkedCoursesCount).toBe(0);
        });
    });

    it('should update the code: PATCH .../codes/:id', async () => {
      await request(app)
        .patch(`/api/v1/admin/master-data/groups/course_level/codes/${codeId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ description: 'For first-time learners' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.description).toBe('For first-time learners');
        });
    });

    it('should 404 when the code id belongs to a different group', async () => {
      await request(app)
        .patch(
          `/api/v1/admin/master-data/groups/course_category/codes/${codeId}`,
        )
        .auth(superAdminToken, { type: 'bearer' })
        .send({ description: 'wrong group' })
        .expect(404);
    });

    it('should deactivate the code without deleting it: PATCH .../codes/:id/deactivate', async () => {
      await request(app)
        .patch(
          `/api/v1/admin/master-data/groups/course_level/codes/${codeId}/deactivate`,
        )
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.isActive).toBe(false);
        });

      await request(app)
        .get('/api/v1/admin/master-data/groups/course_level/codes')
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          const found = body.find((c) => c.id === codeId);
          expect(found).toBeDefined();
          expect(found.isActive).toBe(false);
        });
    });
  });
});
