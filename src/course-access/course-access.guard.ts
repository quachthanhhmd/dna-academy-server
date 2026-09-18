import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  COURSE_ACCESS_METADATA_KEY,
  CourseAccessRule,
  CourseSource,
} from './course-access.decorator';
import { CourseAccessService } from './course-access.service';
import { CourseAccessRepository } from './course-access.repository';

const EDIT_ANY_DENIED = {
  code: 'PERMISSION_DENIED',
  required: { module: 'courses', action: 'edit_any' },
};

/**
 * Enforces `@CourseAccess` (permission model §2.7). Runs after
 * `PermissionGuard`, which has already checked `courses:view` or
 * `courses:edit`; this adds "and on this course".
 */
@Injectable()
export class CourseAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly courseAccessService: CourseAccessService,
    private readonly repository: CourseAccessRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rule = this.reflector.getAllAndOverride<CourseAccessRule | undefined>(
      COURSE_ACCESS_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rule) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId: number = request.user.id;

    if (rule.mode === 'edit_any') {
      if (await this.courseAccessService.canEditAny(userId)) {
        return true;
      }
      throw new ForbiddenException(EDIT_ANY_DENIED);
    }

    const courseId = await this.resolve(rule.from, request.params ?? {});

    if (courseId === undefined) {
      // Unknown resource: whoever could edit it gets the handler's own 404;
      // anyone else gets the same 404 without learning more.
      if (await this.courseAccessService.canEditAny(userId)) {
        return true;
      }
      throw this.courseAccessService.notFound();
    }

    if (courseId === null) {
      // A global career question shows on every course.
      if (await this.courseAccessService.canEditAny(userId)) {
        return true;
      }
      throw new ForbiddenException(EDIT_ANY_DENIED);
    }

    if (rule.mode === 'edit') {
      await this.courseAccessService.assertCanEdit(userId, courseId);
    } else {
      await this.courseAccessService.assertCanView(userId, courseId);
    }

    return true;
  }

  private resolve(
    from: CourseSource,
    params: Record<string, string>,
  ): Promise<string | null | undefined> {
    if ('course' in from) {
      return Promise.resolve(params[from.course]);
    }
    if ('lecture' in from) {
      return this.repository.courseOfLecture(params[from.lecture]);
    }
    if ('enrollment' in from) {
      return this.repository.courseOfEnrollment(params[from.enrollment]);
    }
    return this.repository.courseOfCareerQuestion(params[from.careerQuestion]);
  }
}
