import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import {
  ADMIN_ROLE_ID,
  INSTRUCTOR_ROLE_ID,
  USER_ROLE_ID,
  loginSeededSuperAdmin,
  makeSuperAdmin,
  setUserRole,
} from '../utils/admin';

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
          const adminRow = body.find((role) => role.id === ADMIN_ROLE_ID);
          expect(adminRow).toBeDefined();
          expect(adminRow.assignedUsersCount).toBeGreaterThanOrEqual(1);
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
      await setUserRole(app, superAdminToken, member.userId, roleId);

      await request(app)
        .delete(`/api/v1/admin/roles/${roleId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(409)
        .expect(({ body }) => {
          expect(body.code).toBe('ROLE_HAS_USERS');
        });

      // Move the member off the role so the next test can delete it. Every
      // user holds exactly one role, so "no role" is not an option.
      await setUserRole(app, superAdminToken, member.userId, USER_ROLE_ID);
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

  // With custom roles first-class (D4), roles:edit must not be a way up.
  describe('escalation through role editing', () => {
    const permissionIds = async (roleId: number, keys: string[]) => {
      const { body } = await request(app)
        .get(`/api/v1/admin/roles/${roleId}/permissions`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);
      return (
        body as {
          module: { name: string };
          permissions: { id: string; action: string }[];
        }[]
      ).flatMap((group) =>
        group.permissions
          .filter((p) => keys.includes(`${group.module.name}:${p.action}`))
          .map((p) => p.id),
      );
    };

    const newRole = async (name: string, keys: string[]) => {
      const { body: role } = await request(app)
        .post('/api/v1/admin/roles')
        .auth(superAdminToken, { type: 'bearer' })
        .send({ name: `${name} ${Date.now()}` })
        .expect(201);
      await request(app)
        .put(`/api/v1/admin/roles/${role.id}/permissions`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ permissionIds: await permissionIds(role.id, keys) })
        .expect(200);
      return role.id as number;
    };

    let editorToken: string;
    let editorRoleId: number;

    beforeAll(async () => {
      editorRoleId = await newRole('Role editor', [
        'roles:view',
        'roles:edit',
        'roles:delete',
      ]);
      const editor = await registerAndLogin(
        `roles-admin.editor.${Date.now()}@example.com`,
      );
      await setUserRole(app, superAdminToken, editor.userId, editorRoleId);
      editorToken = editor.token;
    });

    it('should not let a role editor grant their own role more', async () => {
      const { body } = await request(app)
        .put(`/api/v1/admin/roles/${editorRoleId}/permissions`)
        .auth(editorToken, { type: 'bearer' })
        .send({
          permissionIds: await permissionIds(editorRoleId, [
            'roles:view',
            'roles:edit',
            'users:assign_role',
          ]),
        })
        .expect(403);

      expect(body.code).toBe('ROLE_EXCEEDS_CALLER');
    });

    it('should not let a role editor change a role stronger than theirs', async () => {
      const { body } = await request(app)
        .put(`/api/v1/admin/roles/${INSTRUCTOR_ROLE_ID}/permissions`)
        .auth(editorToken, { type: 'bearer' })
        .send({ permissionIds: [] })
        .expect(403);

      expect(body.code).toBe('ROLE_EXCEEDS_CALLER');
    });

    it('should let a role editor change a role within their own permissions', async () => {
      const weaker = await newRole('Weaker', ['roles:view']);

      await request(app)
        .put(`/api/v1/admin/roles/${weaker}/permissions`)
        .auth(editorToken, { type: 'bearer' })
        .send({ permissionIds: await permissionIds(weaker, ['roles:edit']) })
        .expect(200);
    });

    // Admin holds every permission by definition; editing it could only
    // lock everyone out.
    it('should keep the Admin role’s permissions fixed, even for an admin', async () => {
      const { body } = await request(app)
        .put(`/api/v1/admin/roles/${ADMIN_ROLE_ID}/permissions`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ permissionIds: [] })
        .expect(409);

      expect(body.error).toBe('built_in_role');
    });

    it.each([ADMIN_ROLE_ID, USER_ROLE_ID, INSTRUCTOR_ROLE_ID])(
      'should refuse to delete built-in role %i',
      async (roleId) => {
        const { body } = await request(app)
          .delete(`/api/v1/admin/roles/${roleId}`)
          .auth(superAdminToken, { type: 'bearer' })
          .expect(409);

        expect(body.error).toBe('built_in_role');
      },
    );
  });
});
