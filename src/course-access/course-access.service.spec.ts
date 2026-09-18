import { describe, expect, it, beforeEach } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CourseAccessService } from './course-access.service';

/**
 * Permission model §2.7 — who may see and edit a course. The SQL behind the
 * repository seam is exercised by test/admin/course-access.e2e-spec.ts.
 */
describe('CourseAccessService', () => {
  const ADMIN = 1;
  const PRIMARY = 2;
  const CO = 3;
  const GUEST = 4;
  const OUTSIDER = 5;

  let permissions: Map<number, string[]>;
  let teaching: Array<{ userId: number; courseId: string; role: string }>;
  let service: CourseAccessService;

  beforeEach(() => {
    permissions = new Map([
      [ADMIN, ['courses:edit', 'courses:edit_any', 'courses:view']],
      [PRIMARY, ['courses:edit', 'courses:view']],
      [CO, ['courses:edit', 'courses:view']],
      [GUEST, ['courses:edit', 'courses:view']],
      [OUTSIDER, ['courses:edit', 'courses:view']],
    ]);
    teaching = [
      { userId: PRIMARY, courseId: 'c1', role: 'primary' },
      { userId: CO, courseId: 'c1', role: 'co_instructor' },
      { userId: GUEST, courseId: 'c1', role: 'guest' },
      { userId: CO, courseId: 'c2', role: 'primary' },
    ];

    service = new CourseAccessService(
      {
        hasPermission: (userId: number, module: string, action: string) =>
          Promise.resolve(
            (permissions.get(userId) ?? []).includes(`${module}:${action}`),
          ),
      } as never,
      {
        teachingRole: (userId: number, courseId: string) =>
          Promise.resolve(
            teaching.find((t) => t.userId === userId && t.courseId === courseId)
              ?.role ?? null,
          ),
        taughtCourses: (userId: number) =>
          Promise.resolve(
            teaching
              .filter((t) => t.userId === userId)
              .map(({ courseId, role }) => ({ courseId, role })),
          ),
      } as never,
    );
  });

  const failure = (promise: Promise<unknown>) =>
    promise.then(
      () => {
        throw new Error('expected a rejection');
      },
      (error) => error,
    );

  describe('assertCanEdit', () => {
    // D4 — a custom role holding courses:edit_any is treated exactly like
    // Admin, because the check is on the permission (AC-13).
    it('should allow anyone holding courses:edit_any, taught or not', async () => {
      await expect(service.assertCanEdit(ADMIN, 'c9')).resolves.toBeUndefined();
    });

    it('should allow the primary instructor', async () => {
      await expect(
        service.assertCanEdit(PRIMARY, 'c1'),
      ).resolves.toBeUndefined();
    });

    // R4 (AC-23)
    it('should refuse a co-instructor with CO_INSTRUCTOR_READ_ONLY', async () => {
      const error = await failure(service.assertCanEdit(CO, 'c1'));

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.getResponse()).toEqual({
        status: 403,
        code: 'CO_INSTRUCTOR_READ_ONLY',
      });
    });

    it('should treat a guest like a co-instructor', async () => {
      expect(await failure(service.assertCanEdit(GUEST, 'c1'))).toBeInstanceOf(
        ForbiddenException,
      );
    });

    // AC-22 — 404, not 403, so the course's existence is not disclosed.
    it('should 404 for a course the caller does not teach', async () => {
      expect(
        await failure(service.assertCanEdit(OUTSIDER, 'c1')),
      ).toBeInstanceOf(NotFoundException);
    });

    // Primary on one course is not primary on another.
    it('should judge each course on its own', async () => {
      await expect(service.assertCanEdit(CO, 'c2')).resolves.toBeUndefined();
    });
  });

  describe('assertCanView', () => {
    it.each([
      ['an admin', ADMIN, 'c9'],
      ['the primary', PRIMARY, 'c1'],
      ['a co-instructor', CO, 'c1'],
    ])('should allow %s', async (_label, userId, courseId) => {
      await expect(service.assertCanView(userId, courseId)).resolves.toEqual(
        expect.objectContaining({ myRole: expect.any(String) }),
      );
    });

    it('should 404 for a course the caller does not teach', async () => {
      expect(
        await failure(service.assertCanView(OUTSIDER, 'c1')),
      ).toBeInstanceOf(NotFoundException);
    });
  });

  describe('accessOf', () => {
    it.each([
      ['admin', ADMIN, { myRole: 'admin', canEdit: true }],
      ['primary', PRIMARY, { myRole: 'primary', canEdit: true }],
      ['co-instructor', CO, { myRole: 'co_instructor', canEdit: false }],
      ['guest', GUEST, { myRole: 'co_instructor', canEdit: false }],
      ['outsider', OUTSIDER, null],
    ])('should describe the %s', async (_label, userId, expected) => {
      expect(await service.accessOf(userId, 'c1')).toEqual(expected);
    });
  });

  describe('scope', () => {
    it('should be everything for courses:edit_any', async () => {
      expect(await service.scopeOf(ADMIN)).toEqual({ all: true });
    });

    it('should list taught courses, and separately the primary ones', async () => {
      expect(await service.scopeOf(CO)).toEqual({
        all: false,
        courseIds: ['c1', 'c2'],
        primaryCourseIds: ['c2'],
      });
    });

    it('should be empty for someone teaching nothing', async () => {
      expect(await service.scopeOf(OUTSIDER)).toEqual({
        all: false,
        courseIds: [],
        primaryCourseIds: [],
      });
    });
  });
});
