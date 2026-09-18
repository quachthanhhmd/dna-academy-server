import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthorizationService } from '../authorization/authorization.service';
import { CourseAccessRepository } from './course-access.repository';

export type CourseRole = 'admin' | 'primary' | 'co_instructor';

export type CourseAccess = { myRole: CourseRole; canEdit: boolean };

export type CourseScope =
  | { all: true }
  | { all: false; courseIds: string[]; primaryCourseIds: string[] };

/**
 * Permission model §2.7 — the one answer to "may this user see or edit this
 * course". No controller re-implements it.
 *
 * - `courses:edit_any` sees and edits everything (D4: a permission, so a
 *   custom role holding it behaves exactly like Admin).
 * - Otherwise the caller must teach the course through an active instructor
 *   profile. The primary edits; co-instructors and guests only read (R4).
 * - A course the caller does not teach is a 404, never a 403, so its
 *   existence is not disclosed.
 */
@Injectable()
export class CourseAccessService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly repository: CourseAccessRepository,
  ) {}

  canEditAny(userId: number): Promise<boolean> {
    return this.authorizationService.hasPermission(
      userId,
      'courses',
      'edit_any',
    );
  }

  async accessOf(
    userId: number,
    courseId: string,
  ): Promise<CourseAccess | null> {
    if (await this.canEditAny(userId)) {
      return { myRole: 'admin', canEdit: true };
    }

    const role = await this.repository.teachingRole(userId, courseId);

    if (!role) {
      return null;
    }

    return role === 'primary'
      ? { myRole: 'primary', canEdit: true }
      : { myRole: 'co_instructor', canEdit: false };
  }

  async assertCanView(userId: number, courseId: string): Promise<CourseAccess> {
    const access = await this.accessOf(userId, courseId);

    if (!access) {
      throw this.notFound();
    }

    return access;
  }

  async assertCanEdit(userId: number, courseId: string): Promise<void> {
    const access = await this.assertCanView(userId, courseId);

    if (!access.canEdit) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        code: 'CO_INSTRUCTOR_READ_ONLY',
      });
    }
  }

  /**
   * Which courses a list or the dashboard may show. `primaryCourseIds` is the
   * dashboard's scope (D8 — co-instructors are excluded there).
   */
  async scopeOf(userId: number): Promise<CourseScope> {
    if (await this.canEditAny(userId)) {
      return { all: true };
    }

    const taught = await this.repository.taughtCourses(userId);

    return {
      all: false,
      courseIds: taught.map((t) => t.courseId),
      primaryCourseIds: taught
        .filter((t) => t.role === 'primary')
        .map((t) => t.courseId),
    };
  }

  notFound(): NotFoundException {
    return new NotFoundException({
      status: HttpStatus.NOT_FOUND,
      error: 'courseNotFound',
    });
  }
}
