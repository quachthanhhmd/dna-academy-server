import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserRoleChangeService } from './user-role-change.service';

/**
 * Permission model §1.6.2 — the rules of a role change. The SQL behind the
 * repository seam is exercised by test/admin/user-roles-admin.e2e-spec.ts.
 */
describe('UserRoleChangeService', () => {
  const ADMIN = 1;
  const USER = 2;
  const INSTRUCTOR = 4;
  const CUSTOM = 9;
  const ALL = ['users:assign_role', 'users:view', 'courses:edit', 'roles:edit'];

  let roles: Map<number, { id: number; name: string }>;
  let rolePermissions: Map<number, string[]>;
  let userRole: Map<number, number>;
  let activeAdmins: number[];
  let profiles: Map<number, { id: string; isActive: boolean; courses: number }>;
  let writes: string[];
  let service: UserRoleChangeService;

  const ACTOR = 1;

  beforeEach(() => {
    roles = new Map([
      [ADMIN, { id: ADMIN, name: 'Admin' }],
      [USER, { id: USER, name: 'User' }],
      [INSTRUCTOR, { id: INSTRUCTOR, name: 'Instructor' }],
      [CUSTOM, { id: CUSTOM, name: 'Support' }],
    ]);
    rolePermissions = new Map([
      [ADMIN, ALL],
      [USER, []],
      [INSTRUCTOR, ['courses:edit']],
      [CUSTOM, ['users:assign_role', 'users:view']],
    ]);
    userRole = new Map([
      [ACTOR, ADMIN],
      [10, USER],
      [11, INSTRUCTOR],
      [12, ADMIN],
    ]);
    activeAdmins = [ACTOR, 12];
    profiles = new Map();
    writes = [];

    const repository = {
      lockActiveAdminIds: () => Promise.resolve([...activeAdmins]),
      findProfile: (_em: unknown, userId: number) =>
        Promise.resolve(profiles.get(userId) ?? null),
      countTaughtCourses: (_em: unknown, instructorId: string) =>
        Promise.resolve(
          [...profiles.values()].find((p) => p.id === instructorId)?.courses ??
            0,
        ),
      createDraftProfile: (_em: unknown, userId: number) => {
        const created = {
          id: `profile-${userId}`,
          isActive: false,
          courses: 0,
        };
        profiles.set(userId, created);
        writes.push(`profile:create:${userId}`);
        return Promise.resolve(created.id);
      },
      setProfileActive: (_em: unknown, id: string, active: boolean) => {
        writes.push(`profile:${active ? 'activate' : 'deactivate'}:${id}`);
        return Promise.resolve();
      },
    };

    service = new UserRoleChangeService(
      { transaction: (fn: (em: unknown) => unknown) => fn('tx') } as never,
      {
        findById: (id: number) =>
          Promise.resolve(userRole.has(id) ? { id } : null),
      } as never,
      {
        findById: (id: number) => Promise.resolve(roles.get(id) ?? null),
      } as never,
      {
        findByUserId: (id: number) =>
          Promise.resolve(
            userRole.has(id) ? [{ role: { id: userRole.get(id) } }] : [],
          ),
        setRole: (userId: number, roleId: number, by: number, em: unknown) => {
          writes.push(`role:${userId}:${roleId}:by${by}:${String(em)}`);
          userRole.set(userId, roleId);
          return Promise.resolve();
        },
      } as never,
      {
        permissionsOf: (userId: number) =>
          Promise.resolve(rolePermissions.get(userRole.get(userId)!) ?? []),
        permissionsOfRole: (roleId: number) =>
          Promise.resolve(rolePermissions.get(roleId) ?? []),
      } as never,
      repository as never,
    );
  });

  const change = (target: number, roleId: number, actor = ACTOR) =>
    service.changeRole(actor, target, roleId);

  const failure = (target: number, roleId: number, actor = ACTOR) =>
    change(target, roleId, actor).then(
      () => {
        throw new Error('expected a rejection');
      },
      (error) => error,
    );

  describe('User → Instructor', () => {
    it('should set the role inside the transaction', async () => {
      await change(10, INSTRUCTOR);

      expect(writes).toContain(`role:10:${INSTRUCTOR}:by1:tx`);
    });

    it('should create a draft profile when none is linked', async () => {
      const result = await change(10, INSTRUCTOR);

      expect(result).toEqual({
        userId: 10,
        role: { id: INSTRUCTOR, name: 'Instructor' },
        instructorId: 'profile-10',
        profileCreated: true,
      });
    });

    it('should keep a linked profile as it is', async () => {
      profiles.set(10, { id: 'kept', isActive: true, courses: 0 });

      const result = await change(10, INSTRUCTOR);

      expect(result).toMatchObject({
        instructorId: 'kept',
        profileCreated: false,
      });
      expect(writes.filter((w) => w.startsWith('profile:'))).toEqual([]);
    });
  });

  describe('Instructor → User (D10)', () => {
    it('should refuse while the profile teaches anything', async () => {
      profiles.set(11, { id: 'p11', isActive: true, courses: 3 });

      const error = await failure(11, USER);

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toEqual({
        status: 409,
        error: 'instructor_has_courses',
        assignedCoursesCount: 3,
      });
      expect(writes).toEqual([]);
    });

    it('should deactivate an idle profile and demote', async () => {
      profiles.set(11, { id: 'p11', isActive: true, courses: 0 });

      const result = await change(11, USER);

      expect(writes).toEqual([
        'profile:deactivate:p11',
        `role:11:${USER}:by1:tx`,
      ]);
      expect(result).toMatchObject({
        instructorId: 'p11',
        profileCreated: false,
      });
    });

    it('should apply to a move to a custom role too', async () => {
      profiles.set(11, { id: 'p11', isActive: true, courses: 1 });
      rolePermissions.set(CUSTOM, []);

      await expect(change(11, CUSTOM)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    // An admin who also teaches keeps the profile and the courses.
    it('should leave the profile alone on a move to Admin', async () => {
      profiles.set(11, { id: 'p11', isActive: true, courses: 2 });

      await change(11, ADMIN);

      expect(writes).toEqual([`role:11:${ADMIN}:by1:tx`]);
    });
  });

  describe('Admin rules', () => {
    it('should refuse a change to the caller’s own role before anything else', async () => {
      const error = await failure(ACTOR, USER);

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toEqual({
        status: 409,
        error: 'cannot_change_own_role',
      });
    });

    it('should demote an admin while another active admin remains', async () => {
      await change(12, USER);

      expect(userRole.get(12)).toBe(USER);
    });

    it('should refuse to demote the last active admin', async () => {
      activeAdmins = [12];
      rolePermissions.set(CUSTOM, ALL);
      userRole.set(ACTOR, CUSTOM);

      const error = await failure(12, USER);

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toEqual({
        status: 409,
        error: 'cannot_demote_last_admin',
      });
      expect(writes).toEqual([]);
    });
  });

  describe('privilege escalation', () => {
    beforeEach(() => {
      userRole.set(ACTOR, CUSTOM);
    });

    it('should refuse a role granting permissions the caller lacks', async () => {
      const error = await failure(10, ADMIN);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.getResponse()).toEqual({
        status: 403,
        code: 'ROLE_EXCEEDS_CALLER',
      });
      expect(writes).toEqual([]);
    });

    it('should refuse to change someone holding permissions the caller lacks', async () => {
      await expect(change(12, USER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should allow a role within the caller’s own permissions', async () => {
      await change(10, CUSTOM);

      expect(userRole.get(10)).toBe(CUSTOM);
    });
  });

  it('should change nothing when the user already holds the role', async () => {
    const result = await change(10, USER);

    expect(result).toEqual({
      userId: 10,
      role: { id: USER, name: 'User' },
      profileCreated: false,
    });
    expect(writes).toEqual([]);
  });

  it('should 404 for a user that does not exist', async () => {
    expect(await failure(404, USER)).toBeInstanceOf(NotFoundException);
  });

  it('should 422 for a role that does not exist', async () => {
    const error = await failure(10, 777);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect(error.getResponse()).toEqual({
      status: 422,
      errors: { roleId: 'notExists' },
    });
  });
});
