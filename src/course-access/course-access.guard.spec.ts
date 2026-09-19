import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CourseAccessGuard } from './course-access.guard';
import { CourseAccessRule } from './course-access.decorator';

describe('CourseAccessGuard', () => {
  let rule: CourseAccessRule | undefined;
  let editAny: boolean;
  let calls: string[];
  let lectures: Map<string, string>;
  let questions: Map<string, string | null>;
  let guard: CourseAccessGuard;

  const run = (params: Record<string, string>) =>
    guard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 7 }, params }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext);

  beforeEach(() => {
    rule = undefined;
    editAny = false;
    calls = [];
    lectures = new Map([['lec-1', 'course-1']]);
    questions = new Map([
      ['q-course', 'course-1'],
      ['q-global', null],
    ]);

    guard = new CourseAccessGuard(
      { getAllAndOverride: () => rule } as never,
      {
        canEditAny: () => Promise.resolve(editAny),
        assertCanEdit: (userId: number, courseId: string) => {
          calls.push(`edit:${userId}:${courseId}`);
          return Promise.resolve();
        },
        assertCanView: (userId: number, courseId: string) => {
          calls.push(`view:${userId}:${courseId}`);
          return Promise.resolve({ myRole: 'primary', canEdit: true });
        },
        notFound: () => new NotFoundException(),
      } as never,
      {
        courseOfLecture: (id: string) => Promise.resolve(lectures.get(id)),
        courseOfEnrollment: () => Promise.resolve(undefined),
        courseOfCareerQuestion: (id: string) =>
          Promise.resolve(questions.has(id) ? questions.get(id) : undefined),
      } as never,
    );
  });

  it('should let a route without a rule through', async () => {
    await expect(run({})).resolves.toBe(true);
    expect(calls).toEqual([]);
  });

  it('should check edit access on the course named by the param', async () => {
    rule = { mode: 'edit', from: { course: 'courseId' } };

    await run({ courseId: 'course-9' });

    expect(calls).toEqual(['edit:7:course-9']);
  });

  it('should check view access when the rule asks for view', async () => {
    rule = { mode: 'view', from: { course: 'id' } };

    await run({ id: 'course-9' });

    expect(calls).toEqual(['view:7:course-9']);
  });

  it('should resolve a lecture to its course', async () => {
    rule = { mode: 'edit', from: { lecture: 'id' } };

    await run({ id: 'lec-1' });

    expect(calls).toEqual(['edit:7:course-1']);
  });

  it('should 404 an unknown lecture for someone without edit_any', async () => {
    rule = { mode: 'edit', from: { lecture: 'id' } };

    await expect(run({ id: 'nope' })).rejects.toBeInstanceOf(NotFoundException);
  });

  // The handler owns the "not found" answer for callers who could edit it.
  it('should let edit_any through to the handler for an unknown resource', async () => {
    rule = { mode: 'edit', from: { enrollment: 'id' } };
    editAny = true;

    await expect(run({ id: 'nope' })).resolves.toBe(true);
  });

  it('should check the course of a course-scoped question', async () => {
    rule = { mode: 'edit', from: { careerQuestion: 'id' } };

    await run({ id: 'q-course' });

    expect(calls).toEqual(['edit:7:course-1']);
  });

  // A global question appears on every course, so only edit_any edits it.
  it('should refuse a global question without courses:edit_any', async () => {
    rule = { mode: 'edit', from: { careerQuestion: 'id' } };

    const error = await run({ id: 'q-global' }).catch((e) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toEqual({
      code: 'PERMISSION_DENIED',
      required: { module: 'courses', action: 'edit_any' },
    });
  });

  it('should allow a global question with courses:edit_any', async () => {
    rule = { mode: 'edit', from: { careerQuestion: 'id' } };
    editAny = true;

    await expect(run({ id: 'q-global' })).resolves.toBe(true);
  });

  it('should require courses:edit_any outright for an edit_any rule', async () => {
    rule = { mode: 'edit_any' };

    await expect(run({})).rejects.toBeInstanceOf(ForbiddenException);
  });
});
