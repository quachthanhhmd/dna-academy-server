import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin, makeSuperAdmin } from '../utils/admin';

const SUPER_ADMIN_ROLE_ID = 3;

describe('Admin / User Roles', () => {
  const app = APP_URL;
  const runId = Date.now();

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'UR', lastName: 'Tester' })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password })
      .expect(200);

    return { token: body.token as string, userId: body.user.id as number };
  };

  let seededAdminToken: string;
  let superAdminToken: string;
  let targetUserId: number;
  let customRoleId: number;

  beforeAll(async () => {
    seededAdminToken = await loginSeededSuperAdmin(app);
    const superAdmin = await registerAndLogin(
      `user-roles-admin.super.${runId}@example.com`,
    );
    superAdminToken = superAdmin.token;
    await makeSuperAdmin(app, seededAdminToken, superAdmin.userId);

    const target = await registerAndLogin(
      `user-roles-admin.target.${runId}@example.com`,
    );
    targetUserId = target.userId;

    const { body: role } = await request(app)
      .post('/api/v1/admin/roles')
      .auth(superAdminToken, { type: 'bearer' })
      .send({ name: `UR Custom Role ${runId}` })
      .expect(201);
    customRoleId = role.id;
  });

  it('should return an empty role list for a freshly registered user: GET /admin/users/:id/roles', async () => {
    await request(app)
      .get(`/api/v1/admin/users/${targetUserId}/roles`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([]);
      });
  });

  it('should 404 for a non-existent user: GET /admin/users/:id/roles', async () => {
    await request(app)
      .get('/api/v1/admin/users/99999999/roles')
      .auth(superAdminToken, { type: 'bearer' })
      .expect(404);
  });

  it('should reject an unknown roleId with 422: PUT /admin/users/:id/roles', async () => {
    await request(app)
      .put(`/api/v1/admin/users/${targetUserId}/roles`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ roleIds: [999999] })
      .expect(422);
  });

  it('should assign roles to a user: PUT /admin/users/:id/roles', async () => {
    await request(app)
      .put(`/api/v1/admin/users/${targetUserId}/roles`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ roleIds: [customRoleId] })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].id).toBe(customRoleId);
      });

    await request(app)
      .get(`/api/v1/admin/users/${targetUserId}/roles`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.map((role) => role.id)).toEqual([customRoleId]);
      });
  });

  it('should replace (not append to) the role set on a second call: PUT /admin/users/:id/roles', async () => {
    await request(app)
      .put(`/api/v1/admin/users/${targetUserId}/roles`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ roleIds: [SUPER_ADMIN_ROLE_ID] })
      .expect(200)
      .expect(({ body }) => {
        expect(body.map((role) => role.id)).toEqual([SUPER_ADMIN_ROLE_ID]);
      });
  });

  it('should reject a user with no granted permissions: GET /admin/users/:id/roles', async () => {
    const plain = await registerAndLogin(
      `user-roles-admin.plain.${runId}@example.com`,
    );

    await request(app)
      .get(`/api/v1/admin/users/${plain.userId}/roles`)
      .auth(plain.token, { type: 'bearer' })
      .expect(403);
  });
});
