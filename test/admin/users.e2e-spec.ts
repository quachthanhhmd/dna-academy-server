import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import {
  INSTRUCTOR_ROLE_ID,
  USER_ROLE_ID,
  loginSeededSuperAdmin,
  setUserRole,
} from '../utils/admin';
import {
  Account,
  login,
  registerAndLogin,
  uniqueEmail,
} from '../utils/fixtures';

/**
 * Permission model §1.6 (BE-7) — the Students screen. `/users` answers to
 * permissions, not to a role in the token; admins cannot rewrite a learner's
 * profile (R2), and account state has its own endpoint (D9).
 */
describe('Users (§1.6)', () => {
  const app = APP_URL;
  let adminToken: string;
  let adminId: number;

  const rolesOf = async (userId: number): Promise<number[]> => {
    const { body } = await request(app)
      .get(`/api/v1/admin/users/${userId}/roles`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    return body.map((role: { id: number }) => role.id);
  };

  const getUser = async (userId: number) => {
    const { body } = await request(app)
      .get(`/api/v1/users/${userId}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    return body;
  };

  beforeAll(async () => {
    adminToken = await loginSeededSuperAdmin(app);
    const { body } = await request(app)
      .get('/api/v1/auth/me')
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    adminId = body.id;
  });

  describe('guard', () => {
    it('should let an admin list users', async () => {
      const { body } = await request(app)
        .get('/api/v1/users')
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      expect(body.data[0].email).toBeDefined();
      expect(body.data[0].password).toBeUndefined();
    });

    it('should refuse a learner with PERMISSION_DENIED', async () => {
      const learner = await registerAndLogin(app, 'users.learner');

      const { body } = await request(app)
        .get('/api/v1/users')
        .auth(learner.token, { type: 'bearer' })
        .expect(403);

      expect(body).toEqual({
        code: 'PERMISSION_DENIED',
        required: { module: 'users', action: 'view' },
      });
    });

    // Instructors hold no users:* permission (§0.3).
    it('should refuse an instructor', async () => {
      const teacher = await registerAndLogin(app, 'users.teacher');
      await setUserRole(app, adminToken, teacher.userId, INSTRUCTOR_ROLE_ID);

      await request(app)
        .get(`/api/v1/users/${teacher.userId}`)
        .auth(teacher.token, { type: 'bearer' })
        .expect(403);
    });

    // A sort key is a column name; sorting by the password hash would leak
    // an ordering of hashes to anyone holding users:view.
    it('should refuse to sort by the password', async () => {
      await request(app)
        .get('/api/v1/users')
        .query({
          sort: JSON.stringify([{ orderBy: 'password', order: 'ASC' }]),
        })
        .auth(adminToken, { type: 'bearer' })
        .expect(422);
    });

    it('should filter by the role held in user_role', async () => {
      const teacher = await registerAndLogin(app, 'users.filter');
      await setUserRole(app, adminToken, teacher.userId, INSTRUCTOR_ROLE_ID);

      const { body } = await request(app)
        .get('/api/v1/users')
        .query({
          filters: JSON.stringify({ roles: [{ id: INSTRUCTOR_ROLE_ID }] }),
          limit: 50,
        })
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      const ids = body.data.map((user: { id: number }) => user.id);
      expect(ids).toContain(teacher.userId);
      for (const id of ids.slice(0, 5)) {
        expect(await rolesOf(id)).toEqual([INSTRUCTOR_ROLE_ID]);
      }
    });
  });

  describe('POST /users', () => {
    // `role` is ignored, not honoured: the only way to a role is §1.6.2.
    it('should create a User even when the body asks for Admin', async () => {
      const email = uniqueEmail('users.created');
      const { body } = await request(app)
        .post('/api/v1/users')
        .auth(adminToken, { type: 'bearer' })
        .send({
          email,
          password: 'secret-123',
          firstName: 'Created',
          lastName: 'ByAdmin',
          role: { id: 1 },
          status: { id: 1 },
        })
        .expect(201);

      expect(await rolesOf(body.id)).toEqual([USER_ROLE_ID]);
      await login(app, email);
    });

    it('should reject an invalid email', () =>
      request(app)
        .post('/api/v1/users')
        .auth(adminToken, { type: 'bearer' })
        .send({ email: 'fail-data' })
        .expect(422));
  });

  describe('PATCH /users/:id', () => {
    // R2 (AC-7) — a learner's data is theirs.
    it('should refuse to edit a learner with STUDENT_PROFILE_IMMUTABLE', async () => {
      const learner = await registerAndLogin(app, 'users.immutable');

      const { body } = await request(app)
        .patch(`/api/v1/users/${learner.userId}`)
        .auth(adminToken, { type: 'bearer' })
        .send({ firstName: 'Renamed' })
        .expect(403);

      expect(body).toEqual({ status: 403, code: 'STUDENT_PROFILE_IMMUTABLE' });
      expect((await getUser(learner.userId)).firstName).toBe('Fixture');
    });

    describe('on a non-learner (AC-8)', () => {
      let teacher: Account;

      beforeAll(async () => {
        teacher = await registerAndLogin(app, 'users.editable');
        await setUserRole(app, adminToken, teacher.userId, INSTRUCTOR_ROLE_ID);
      });

      it('should update profile fields', async () => {
        await request(app)
          .patch(`/api/v1/users/${teacher.userId}`)
          .auth(adminToken, { type: 'bearer' })
          .send({ firstName: 'Renamed' })
          .expect(200);

        expect((await getUser(teacher.userId)).firstName).toBe('Renamed');
      });

      it('should ignore role, email, password and status', async () => {
        await request(app)
          .patch(`/api/v1/users/${teacher.userId}`)
          .auth(adminToken, { type: 'bearer' })
          .send({
            role: { id: 1 },
            email: uniqueEmail('users.hijack'),
            password: 'attacker-chosen',
            status: { id: 3 },
          })
          .expect(200);

        expect(await rolesOf(teacher.userId)).toEqual([INSTRUCTOR_ROLE_ID]);
        const user = await getUser(teacher.userId);
        expect(user.email).toBe(teacher.email);
        expect(user.status.id).toBe(2);
        await login(app, teacher.email);
      });
    });
  });

  describe('PATCH /users/:id/status (D9)', () => {
    const setStatus = (token: string, userId: number, statusId: number) =>
      request(app)
        .patch(`/api/v1/users/${userId}/status`)
        .auth(token, { type: 'bearer' })
        .send({ statusId });

    it('should deactivate a learner so they cannot sign in', async () => {
      const learner = await registerAndLogin(app, 'users.deactivate');

      const { body } = await setStatus(adminToken, learner.userId, 3).expect(
        200,
      );

      expect(body.status.id).toBe(3);
      const { body: refused } = await request(app)
        .post('/api/v1/auth/email/login')
        .send({ email: learner.email, password: 'secret-123' })
        .expect(403);
      expect(refused.code).toBe('ACCOUNT_DEACTIVATED');
    });

    it('should end the deactivated account’s sessions', async () => {
      const email = uniqueEmail('users.sessions');
      await request(app)
        .post('/api/v1/auth/email/register')
        .send({ email, password: 'secret-123', firstName: 'S', lastName: 'S' })
        .expect(204);
      const { body: session } = await request(app)
        .post('/api/v1/auth/email/login')
        .send({ email, password: 'secret-123' })
        .expect(200);

      await setStatus(adminToken, session.user.id, 3).expect(200);

      await request(app)
        .post('/api/v1/auth/refresh')
        .auth(session.refreshToken, { type: 'bearer' })
        .expect(401);
    });

    // Confirming an email turns `inactive` into `active`; it must not undo a
    // deactivation.
    it('should not let a deactivated account reactivate itself by email', async () => {
      const learner = await registerAndLogin(app, 'users.resend');
      await setStatus(adminToken, learner.userId, 3).expect(200);

      await request(app)
        .post('/api/v1/auth/email/confirm/resend')
        .send({ email: learner.email })
        .expect(422);
    });

    it('should reactivate an account', async () => {
      const learner = await registerAndLogin(app, 'users.reactivate');
      await setStatus(adminToken, learner.userId, 3).expect(200);

      await setStatus(adminToken, learner.userId, 1).expect(200);

      await login(app, learner.email);
    });

    // Unverified is where registration leaves an account, not a switch.
    it('should refuse to set an account to unverified', async () => {
      const learner = await registerAndLogin(app, 'users.unverified');

      await setStatus(adminToken, learner.userId, 2).expect(422);
    });

    it('should refuse to deactivate the caller themselves', async () => {
      const { body } = await setStatus(adminToken, adminId, 3).expect(409);

      expect(body.error).toBe('cannot_change_own_status');
    });
  });

  describe('custom roles cannot reach above themselves', () => {
    let support: Account;

    beforeAll(async () => {
      support = await registerAndLogin(app, 'users.support');
      const { body: role } = await request(app)
        .post('/api/v1/admin/roles')
        .auth(adminToken, { type: 'bearer' })
        .send({ name: `Support ${Date.now()}` })
        .expect(201);
      const { body: matrix } = await request(app)
        .get(`/api/v1/admin/roles/${role.id}/permissions`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);
      const users = matrix.find(
        (m: { module: { name: string } }) => m.module.name === 'users',
      );
      await request(app)
        .put(`/api/v1/admin/roles/${role.id}/permissions`)
        .auth(adminToken, { type: 'bearer' })
        .send({
          permissionIds: users.permissions
            .filter((p: { action: string }) =>
              ['view', 'edit', 'delete'].includes(p.action),
            )
            .map((p: { id: string }) => p.id),
        })
        .expect(200);
      await setUserRole(app, adminToken, support.userId, role.id);
    });

    it('should not deactivate an Admin', async () => {
      const { body } = await request(app)
        .patch(`/api/v1/users/${adminId}/status`)
        .auth(support.token, { type: 'bearer' })
        .send({ statusId: 3 })
        .expect(403);

      expect(body.code).toBe('ROLE_EXCEEDS_CALLER');
    });

    it('should not delete an Admin', async () => {
      await request(app)
        .delete(`/api/v1/users/${adminId}`)
        .auth(support.token, { type: 'bearer' })
        .expect(403);

      await getUser(adminId);
    });

    it('should still deactivate a learner', async () => {
      const learner = await registerAndLogin(app, 'users.support-target');

      await request(app)
        .patch(`/api/v1/users/${learner.userId}/status`)
        .auth(support.token, { type: 'bearer' })
        .send({ statusId: 3 })
        .expect(200);
    });
  });

  it('should refuse to delete the caller’s own account', async () => {
    const { body } = await request(app)
      .delete(`/api/v1/users/${adminId}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(409);

    expect(body.error).toBe('cannot_delete_self');
  });
});
