import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import {
  INSTRUCTOR_ROLE_ID,
  loginSeededSuperAdmin,
  setUserRole,
} from '../utils/admin';
import { registerAndLogin } from '../utils/fixtures';

/**
 * Permission model §1.2 (BE-8) — everything the client gates on comes from
 * `GET /auth/me/permissions`; the token names the user and nothing else.
 */
describe('GET /auth/me/permissions (§1.2)', () => {
  const app = APP_URL;
  let adminToken: string;

  const permissionsOf = async (token: string) => {
    const { body } = await request(app)
      .get('/api/v1/auth/me/permissions')
      .auth(token, { type: 'bearer' })
      .expect(200);
    return body;
  };

  beforeAll(async () => {
    adminToken = await loginSeededSuperAdmin(app);
  });

  // AC-14
  it('should list exactly the Instructor permissions for an instructor', async () => {
    const teacher = await registerAndLogin(app, 'me.instructor');
    await setUserRole(app, adminToken, teacher.userId, INSTRUCTOR_ROLE_ID);

    expect(await permissionsOf(teacher.token)).toEqual({
      role: { id: 4, name: 'Instructor' },
      permissions: ['courses:edit', 'courses:view', 'dashboard:view'],
    });
  });

  it('should list nothing for a learner', async () => {
    const learner = await registerAndLogin(app, 'me.learner');

    expect(await permissionsOf(learner.token)).toEqual({
      role: { id: 2, name: 'User' },
      permissions: [],
    });
  });

  it('should list all forty, sorted, for an admin', async () => {
    const { role, permissions } = await permissionsOf(adminToken);

    expect(role).toEqual({ id: 1, name: 'Admin' });
    expect(permissions).toHaveLength(40);
    expect(permissions).toEqual([...permissions].sort());
    expect(permissions).toEqual(
      expect.arrayContaining([
        'courses:edit_any',
        'dashboard:view_students',
        'instructors:create_account',
        'users:assign_role',
      ]),
    );
  });

  // A role change shows up on the next call, without a new token.
  it('should reflect a role change without signing in again', async () => {
    const learner = await registerAndLogin(app, 'me.promoted');
    await setUserRole(app, adminToken, learner.userId, INSTRUCTOR_ROLE_ID);

    const { permissions } = await permissionsOf(learner.token);

    expect(permissions).toContain('courses:edit');
  });

  it('should require a login', () =>
    request(app).get('/api/v1/auth/me/permissions').expect(401));

  it('should not put a role in the access token', async () => {
    const learner = await registerAndLogin(app, 'me.token');
    const payload = JSON.parse(
      Buffer.from(learner.token.split('.')[1], 'base64url').toString(),
    );

    expect(Object.keys(payload).sort()).toEqual([
      'exp',
      'iat',
      'id',
      'sessionId',
    ]);
  });

  // Deprecated, kept for the transition: GET /auth/me still reports the role,
  // and it agrees with user_role.
  it('should keep GET /auth/me reporting the same role', async () => {
    const teacher = await registerAndLogin(app, 'me.mirror');
    await setUserRole(app, adminToken, teacher.userId, INSTRUCTOR_ROLE_ID);

    const { body } = await request(app)
      .get('/api/v1/auth/me')
      .auth(teacher.token, { type: 'bearer' })
      .expect(200);

    expect(body.role.id).toBe(INSTRUCTOR_ROLE_ID);
  });
});
