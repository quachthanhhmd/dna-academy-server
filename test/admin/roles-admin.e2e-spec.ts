import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import {
  loginSeededSuperAdmin,
  makeSuperAdmin,
  setUserRoles,
} from '../utils/admin';

const SUPER_ADMIN_ROLE_ID = 3;

describe('Admin / Roles', () => {
  const app = APP_URL;
  const runId = Date.now();

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'Admin', lastName: 'Tester' })
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
      `roles-admin.super.${runId}@example.com`,
    );
    superAdminToken = superAdmin.token;
    await makeSuperAdmin(app, seededAdminToken, superAdmin.userId);

    const plainUser = await registerAndLogin(
      `roles-admin.plain.${runId}@example.com`,
    );
    plainUserToken = plainUser.token;
  });

  describe('PermissionGuard', () => {
    it('should reject a user with no granted roles/permissions: GET /admin/roles', async () => {
      await request(app)
        .get('/api/v1/admin/roles')
        .auth(plainUserToken, { type: 'bearer' })
        .expect(403)
        .expect(({ body }) => {
          expect(body.code).toBe('PERMISSION_DENIED');
        });
    });

    it('should reject an unauthenticated request: GET /admin/roles', async () => {
      await request(app).get('/api/v1/admin/roles').expect(401);
    });
  });

  describe('Role CRUD', () => {
    const roleName = `Content Editor ${runId}`;
    let roleId: number;

    it('should list roles with assignedUsersCount: GET /admin/roles', async () => {
      await request(app)
        .get('/api/v1/admin/roles')
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          const superAdminRow = body.find(
            (role) => role.id === SUPER_ADMIN_ROLE_ID,
          );
          expect(superAdminRow).toBeDefined();
          expect(superAdminRow.assignedUsersCount).toBeGreaterThanOrEqual(1);
        });
    });

    it('should create a role: POST /admin/roles', async () => {
      const { body } = await request(app)
        .post('/api/v1/admin/roles')
        .auth(superAdminToken, { type: 'bearer' })
        .send({ name: roleName, description: 'Can edit content' })
        .expect(201);

      expect(body.name).toBe(roleName);
      expect(body.isActive).toBe(true);
      roleId = body.id;
    });

    it('should reject a duplicate role name with 409: POST /admin/roles', async () => {
      await request(app)
        .post('/api/v1/admin/roles')
        .auth(superAdminToken, { type: 'bearer' })
        .send({ name: roleName })
        .expect(409);
    });

    it('should update a role: PATCH /admin/roles/:id', async () => {
      await request(app)
        .patch(`/api/v1/admin/roles/${roleId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ description: 'Updated description', isActive: false })
        .expect(200)
        .expect(({ body }) => {
          expect(body.description).toBe('Updated description');
          expect(body.isActive).toBe(false);
        });
    });

    it('should return permissions grouped by module, all ungranted for a new role: GET /admin/roles/:id/permissions', async () => {
      await request(app)
        .get(`/api/v1/admin/roles/${roleId}/permissions`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(Array.isArray(body)).toBe(true);
          expect(body.length).toBeGreaterThan(0);
          const rolesGroup = body.find((g) => g.module.name === 'roles');
          expect(rolesGroup).toBeDefined();
          expect(
            rolesGroup.permissions.every((p) => p.isGranted === false),
          ).toBe(true);
        });
    });

    it('should replace role permissions: PUT /admin/roles/:id/permissions', async () => {
      const { body: groups } = await request(app)
        .get(`/api/v1/admin/roles/${roleId}/permissions`)
        .auth(superAdminToken, { type: 'bearer' });

      const rolesGroup = groups.find((g) => g.module.name === 'roles');
      const viewPermission = rolesGroup.permissions.find(
        (p) => p.action === 'view',
      );

      const { body: updated } = await request(app)
        .put(`/api/v1/admin/roles/${roleId}/permissions`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ permissionIds: [viewPermission.id] })
        .expect(200);

      const updatedRolesGroup = updated.find((g) => g.module.name === 'roles');
      const updatedView = updatedRolesGroup.permissions.find(
        (p) => p.action === 'view',
      );
      const updatedEdit = updatedRolesGroup.permissions.find(
        (p) => p.action === 'edit',
      );
      expect(updatedView.isGranted).toBe(true);
      expect(updatedEdit.isGranted).toBe(false);
    });

    it('should reject an unknown permissionId with 422: PUT /admin/roles/:id/permissions', async () => {
      await request(app)
        .put(`/api/v1/admin/roles/${roleId}/permissions`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ permissionIds: ['00000000-0000-0000-0000-000000000000'] })
        .expect(422);
    });

    it('should reject deleting a role that still has assigned users: DELETE /admin/roles/:id', async () => {
      const member = await registerAndLogin(
        `roles-admin.member.${runId}@example.com`,
      );
      await setUserRoles(app, superAdminToken, member.userId, [roleId]);

      await request(app)
        .delete(`/api/v1/admin/roles/${roleId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(409)
        .expect(({ body }) => {
          expect(body.code).toBe('ROLE_HAS_USERS');
        });

      // Clear the assignment so the next test can delete the role. PUT
      // replaces the whole set, so an empty array is the removal.
      await setUserRoles(app, superAdminToken, member.userId, []);
    });

    it('should delete a role with no assigned users: DELETE /admin/roles/:id', async () => {
      await request(app)
        .delete(`/api/v1/admin/roles/${roleId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(204);

      await request(app)
        .get(`/api/v1/admin/roles/${roleId}/permissions`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(404);
    });
  });
});
