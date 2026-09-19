import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import {
  ADMIN_ROLE_ID,
  INSTRUCTOR_ROLE_ID,
  USER_ROLE_ID,
  loginSeededSuperAdmin,
  setUserRole,
} from '../utils/admin';
import {
  Account,
  createCourse,
  createInstructorProfile,
  registerAndLogin,
} from '../utils/fixtures';

/**
 * Permission model §1.6.2 (BE-11) — `PUT /admin/users/:id/roles` is the only
 * way a role changes, and every rule in its transition table holds.
 */
describe('Admin / User role (§1.6.2)', () => {
  const app = APP_URL;
  let adminToken: string;

  const putRole = (token: string, userId: number, body: unknown) =>
    request(app)
      .put(`/api/v1/admin/users/${userId}/roles`)
      .auth(token, { type: 'bearer' })
      .send(body as object);

  const rolesOf = async (userId: number): Promise<number[]> => {
    const { body } = await request(app)
      .get(`/api/v1/admin/users/${userId}/roles`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    return body.map((role: { id: number }) => role.id);
  };

  const profileOf = async (instructorId: string) => {
    const { body } = await request(app)
      .get(`/api/v1/admin/instructors/${instructorId}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    return body;
  };

  beforeAll(async () => {
    adminToken = await loginSeededSuperAdmin(app);
  });

  describe('User → Instructor (AC-9)', () => {
    let learner: Account;

    beforeAll(async () => {
      learner = await registerAndLogin(app, 'ur.to-instructor');
    });

    it('should give the user exactly the Instructor role', async () => {
      const { body } = await putRole(adminToken, learner.userId, {
        roleId: INSTRUCTOR_ROLE_ID,
      }).expect(200);

      expect(body).toMatchObject({
        userId: learner.userId,
        role: { id: INSTRUCTOR_ROLE_ID, name: 'Instructor' },
        profileCreated: true,
      });
      expect(await rolesOf(learner.userId)).toEqual([INSTRUCTOR_ROLE_ID]);
    });

    it('should have created a draft profile linked to the account', async () => {
      const { body } = await putRole(adminToken, learner.userId, {
        roleId: INSTRUCTOR_ROLE_ID,
      }).expect(200);

      const profile = await profileOf(body.instructorId);
      expect(profile.userId).toBe(learner.userId);
      expect(profile.isActive).toBe(false);
    });

    // Same role → no change, and no second profile.
    it('should change nothing when the role is already held', async () => {
      const first = await putRole(adminToken, learner.userId, {
        roleId: INSTRUCTOR_ROLE_ID,
      }).expect(200);

      const { body } = await putRole(adminToken, learner.userId, {
        roleId: INSTRUCTOR_ROLE_ID,
      }).expect(200);

      expect(body.profileCreated).toBe(false);
      expect(body.instructorId).toBe(first.body.instructorId);
    });
  });

  it('should keep a profile the user already had instead of creating one', async () => {
    const learner = await registerAndLogin(app, 'ur.has-profile');
    const existing = await createInstructorProfile(app, adminToken, {
      userId: learner.userId,
    });

    const { body } = await putRole(adminToken, learner.userId, {
      roleId: INSTRUCTOR_ROLE_ID,
    }).expect(200);

    expect(body).toMatchObject({
      instructorId: existing,
      profileCreated: false,
    });
  });

  describe('Instructor → User (D10)', () => {
    it('should refuse while the profile teaches a course (AC-10)', async () => {
      const teacher = await registerAndLogin(app, 'ur.teaching');
      const { body: promoted } = await putRole(adminToken, teacher.userId, {
        roleId: INSTRUCTOR_ROLE_ID,
      }).expect(200);
      // The draft profile is inactive until an admin publishes it; only active
      // instructors can be put on a course.
      await request(app)
        .patch(`/api/v1/admin/instructors/${promoted.instructorId}/status`)
        .auth(adminToken, { type: 'bearer' })
        .send({ isActive: true })
        .expect(200);
      await createCourse(app, adminToken, {
        primaryInstructorId: promoted.instructorId,
      });

      const { body } = await putRole(adminToken, teacher.userId, {
        roleId: USER_ROLE_ID,
      }).expect(409);

      expect(body).toEqual({
        status: 409,
        error: 'instructor_has_courses',
        assignedCoursesCount: 1,
      });
      expect(await rolesOf(teacher.userId)).toEqual([INSTRUCTOR_ROLE_ID]);
    });

    it('should demote and deactivate the profile when it teaches nothing', async () => {
      const idle = await registerAndLogin(app, 'ur.idle');
      const { body: promoted } = await putRole(adminToken, idle.userId, {
        roleId: INSTRUCTOR_ROLE_ID,
      }).expect(200);

      await putRole(adminToken, idle.userId, { roleId: USER_ROLE_ID }).expect(
        200,
      );

      expect(await rolesOf(idle.userId)).toEqual([USER_ROLE_ID]);
      expect((await profileOf(promoted.instructorId)).isActive).toBe(false);
    });
  });

  describe('Admin rules (AC-11)', () => {
    it('should refuse a change to the caller’s own role', async () => {
      const { body: me } = await request(app)
        .get('/api/v1/auth/me')
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      const { body } = await putRole(adminToken, me.id, {
        roleId: USER_ROLE_ID,
      }).expect(409);

      expect(body.error).toBe('cannot_change_own_role');
    });

    it('should let one admin demote another while another admin remains', async () => {
      const other = await registerAndLogin(app, 'ur.other-admin');
      await setUserRole(app, adminToken, other.userId, ADMIN_ROLE_ID);

      await putRole(adminToken, other.userId, { roleId: USER_ROLE_ID }).expect(
        200,
      );

      expect(await rolesOf(other.userId)).toEqual([USER_ROLE_ID]);
    });

    // AC-12 — the role is read from user_role on every request, not from a
    // token minted while the caller was still an admin.
    it('should take a demoted admin’s access away on the next request', async () => {
      const demoted = await registerAndLogin(app, 'ur.demoted');
      await setUserRole(app, adminToken, demoted.userId, ADMIN_ROLE_ID);
      await request(app)
        .get('/api/v1/users')
        .auth(demoted.token, { type: 'bearer' })
        .expect(200);

      await putRole(adminToken, demoted.userId, {
        roleId: USER_ROLE_ID,
      }).expect(200);

      await request(app)
        .get('/api/v1/users')
        .auth(demoted.token, { type: 'bearer' })
        .expect(403);
    });
  });

  describe('validation', () => {
    let target: Account;

    beforeAll(async () => {
      target = await registerAndLogin(app, 'ur.validation');
    });

    it('should reject an unknown role', async () => {
      const { body } = await putRole(adminToken, target.userId, {
        roleId: 999999,
      }).expect(422);

      expect(body.errors).toEqual({ roleId: 'notExists' });
    });

    it('should reject the old roleIds body', () =>
      putRole(adminToken, target.userId, { roleIds: [2] }).expect(422));

    it('should 404 for a user that does not exist', () =>
      putRole(adminToken, 99999999, { roleId: USER_ROLE_ID }).expect(404));

    it('should always list exactly one role', async () => {
      expect(await rolesOf(target.userId)).toEqual([USER_ROLE_ID]);
    });
  });

  describe('permission', () => {
    // users:edit used to be enough; assigning roles is its own permission.
    it('should require users:assign_role, not users:edit', async () => {
      const editor = await registerAndLogin(app, 'ur.editor');
      const target = await registerAndLogin(app, 'ur.editor-target');
      const { body: role } = await request(app)
        .post('/api/v1/admin/roles')
        .auth(adminToken, { type: 'bearer' })
        .send({ name: `UR editor ${Date.now()}` })
        .expect(201);
      await grant(role.id, [['users', 'edit']]);
      await setUserRole(app, adminToken, editor.userId, role.id);

      const { body } = await putRole(editor.token, target.userId, {
        roleId: INSTRUCTOR_ROLE_ID,
      }).expect(403);

      expect(body).toEqual({
        code: 'PERMISSION_DENIED',
        required: { module: 'users', action: 'assign_role' },
      });
    });

    // A custom role that may assign roles must not be able to mint Admins, or
    // users:assign_role is Admin under another name.
    it('should refuse to grant a role holding permissions the caller lacks', async () => {
      const assigner = await registerAndLogin(app, 'ur.assigner');
      const accomplice = await registerAndLogin(app, 'ur.accomplice');
      const { body: role } = await request(app)
        .post('/api/v1/admin/roles')
        .auth(adminToken, { type: 'bearer' })
        .send({ name: `UR assigner ${Date.now()}` })
        .expect(201);
      await grant(role.id, [['users', 'assign_role']]);
      await setUserRole(app, adminToken, assigner.userId, role.id);

      const { body } = await putRole(assigner.token, accomplice.userId, {
        roleId: ADMIN_ROLE_ID,
      }).expect(403);

      expect(body.code).toBe('ROLE_EXCEEDS_CALLER');
      expect(await rolesOf(accomplice.userId)).toEqual([USER_ROLE_ID]);
    });

    it('should refuse to change the role of someone holding permissions the caller lacks', async () => {
      const assigner = await registerAndLogin(app, 'ur.assigner2');
      const { body: role } = await request(app)
        .post('/api/v1/admin/roles')
        .auth(adminToken, { type: 'bearer' })
        .send({ name: `UR assigner2 ${Date.now()}` })
        .expect(201);
      await grant(role.id, [['users', 'assign_role']]);
      await setUserRole(app, adminToken, assigner.userId, role.id);
      const { body: me } = await request(app)
        .get('/api/v1/auth/me')
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      const { body } = await putRole(assigner.token, me.id, {
        roleId: USER_ROLE_ID,
      }).expect(403);

      expect(body.code).toBe('ROLE_EXCEEDS_CALLER');
    });
  });

  /** Gives a custom role exactly these permissions through the roles API. */
  const grant = async (roleId: number, keys: [string, string][]) => {
    const { body: matrix } = await request(app)
      .get(`/api/v1/admin/roles/${roleId}/permissions`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    const ids = keys.map(([module, action]) => {
      const group = (
        matrix as {
          module: { name: string };
          permissions: { id: string; action: string }[];
        }[]
      ).find((m) => m.module.name === module)!;
      return group.permissions.find((p) => p.action === action)!.id;
    });

    await request(app)
      .put(`/api/v1/admin/roles/${roleId}/permissions`)
      .auth(adminToken, { type: 'bearer' })
      .send({ permissionIds: ids })
      .expect(200);
  };
});
