import { SetMetadata } from '@nestjs/common';

export const COURSE_ACCESS_METADATA_KEY = 'course-access';

/** Where the guard finds the course: a route param naming it or a child. */
export type CourseSource =
  | { course: string }
  | { lecture: string }
  | { enrollment: string }
  | { careerQuestion: string };

export type CourseAccessRule =
  | { mode: 'view' | 'edit'; from: CourseSource }
  /** Only callers holding `courses:edit_any` — admin-only course writes. */
  | { mode: 'edit_any' };

/**
 * Permission model §2.7 — ownership on top of `@RequirePermission`. Applied
 * with `CourseAccessGuard`, listed after `PermissionGuard`.
 */
export const CourseAccess = (rule: CourseAccessRule) =>
  SetMetadata<string, CourseAccessRule>(COURSE_ACCESS_METADATA_KEY, rule);
