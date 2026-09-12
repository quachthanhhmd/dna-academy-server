import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CourseInstructorsService } from '../course-instructors/course-instructors.service';
import { CourseInstructor } from '../course-instructors/domain/course-instructor';
import { InstructorsService } from '../instructors/instructors.service';
import { Instructor } from '../instructors/domain/instructor';
import { InstructorStatsService } from '../instructors-admin/instructor-stats.service';
import { toInstructorRef } from '../instructors/dto/instructor-profile.dto';
import { CourseInstructorsView } from '../course-instructors/course-instructors.service';
import { Course } from '../courses/domain/course';

export type AssignInstructorsInput = {
  primaryInstructorId?: string;
  coInstructorIds?: string[];
};

export type { CourseInstructorsView };

type DesiredAssignment = {
  instructor: Instructor;
  role: CourseInstructor['role'];
  displayOrder: number;
};

@Injectable()
export class CourseInstructorsAdminService {
  constructor(
    private readonly courseInstructorsService: CourseInstructorsService,
    private readonly instructorsService: InstructorsService,
    private readonly instructorStatsService: InstructorStatsService,
  ) {}

  /**
   * Reconciles a course's `course_instructor` rows against the payload. Both
   * keys are optional so a PATCH that only touches co-instructors keeps the
   * current primary, and a payload with neither key is a no-op.
   */
  async assign(
    courseId: Course['id'],
    input: AssignInstructorsInput,
  ): Promise<CourseInstructorsView> {
    const existing =
      await this.courseInstructorsService.findByCourseId(courseId);

    if (
      input.primaryInstructorId === undefined &&
      input.coInstructorIds === undefined
    ) {
      return CourseInstructorsService.toView(existing);
    }

    return this.applyDiff(
      courseId,
      existing,
      await this.resolveDesired(input, existing),
    );
  }

  /**
   * Runs the same validation `assign` does, without writing anything. Course
   * creation calls this before inserting the course row so an invalid
   * instructor payload cannot leave an orphaned draft behind.
   */
  async validateAssignable(input: AssignInstructorsInput): Promise<void> {
    await this.resolveDesired(input, []);
  }

  private async resolveDesired(
    input: AssignInstructorsInput,
    existing: CourseInstructor[],
  ): Promise<DesiredAssignment[]> {
    const currentPrimaryId = existing.find((row) => row.role === 'primary')
      ?.instructor.id;
    const currentCoIds = existing
      .filter((row) => row.role !== 'primary')
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((row) => row.instructor.id);

    const primaryId =
      input.primaryInstructorId !== undefined
        ? input.primaryInstructorId
        : currentPrimaryId;

    const coIds = [
      ...new Set(
        input.coInstructorIds !== undefined
          ? input.coInstructorIds
          : currentCoIds,
      ),
    ];

    if (!primaryId) {
      // Nothing selected at all is allowed: a draft course may be created
      // before its instructor profile exists. Co-instructors without a
      // primary are not — the course would have no owner.
      if (!coIds.length) {
        return [];
      }

      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { primaryInstructorId: 'required' },
      });
    }

    if (coIds.includes(primaryId)) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { coInstructorIds: 'duplicatePrimary' },
      });
    }

    const desired: DesiredAssignment[] = [
      {
        instructor: await this.resolveInstructor(
          primaryId,
          existing,
          'primaryInstructorId',
        ),
        role: 'primary',
        displayOrder: 0,
      },
    ];

    for (const [index, coId] of coIds.entries()) {
      desired.push({
        instructor: await this.resolveInstructor(
          coId,
          existing,
          'coInstructorIds',
        ),
        role: 'co_instructor',
        displayOrder: index + 1,
      });
    }

    return desired;
  }

  findByCourse(courseId: Course['id']): Promise<CourseInstructorsView> {
    return this.courseInstructorsService.findViewByCourseId(courseId);
  }

  findByCourses(
    courseIds: Course['id'][],
  ): Promise<Map<Course['id'], CourseInstructorsView>> {
    return this.courseInstructorsService.findViewByCourseIds(courseIds);
  }

  removeByCourse(courseId: Course['id']) {
    return this.courseInstructorsService.removeByCourseId(courseId);
  }

  private async applyDiff(
    courseId: Course['id'],
    existing: CourseInstructor[],
    desired: DesiredAssignment[],
  ): Promise<CourseInstructorsView> {
    const desiredIds = new Set(desired.map((item) => item.instructor.id));
    const touchedInstructorIds: string[] = [];

    const removed = existing.filter(
      (row) => !desiredIds.has(row.instructor.id),
    );
    for (const row of removed) {
      await this.courseInstructorsService.remove(row.id);
      touchedInstructorIds.push(row.instructor.id);
    }

    const kept = desired.filter((item) =>
      existing.some((row) => row.instructor.id === item.instructor.id),
    );

    // Demote first, promote second: `one_primary_per_course` is a partial
    // unique index, so two rows may never carry role='primary' at once — not
    // even transiently while a co-instructor is being promoted.
    for (const item of [...kept].sort((a, b) =>
      a.role === 'primary' ? 1 : b.role === 'primary' ? -1 : 0,
    )) {
      const row = existing.find(
        (candidate) => candidate.instructor.id === item.instructor.id,
      )!;

      if (row.role !== item.role || row.displayOrder !== item.displayOrder) {
        await this.courseInstructorsService.update(row.id, {
          role: item.role,
          displayOrder: item.displayOrder,
        });
      }
    }

    for (const item of desired) {
      const alreadyThere = existing.some(
        (row) => row.instructor.id === item.instructor.id,
      );

      if (alreadyThere) {
        continue;
      }

      await this.courseInstructorsService.create({
        course: { id: courseId } as Course,
        instructor: item.instructor,
        role: item.role,
        displayOrder: item.displayOrder,
      });
      touchedInstructorIds.push(item.instructor.id);
    }

    if (touchedInstructorIds.length) {
      await this.instructorStatsService.recomputeMany(touchedInstructorIds);
    }

    return {
      primaryInstructor:
        desired
          .filter((item) => item.role === 'primary')
          .map((item) => toInstructorRef(item.instructor))[0] ?? null,
      coInstructors: desired
        .filter((item) => item.role !== 'primary')
        .map((item) => toInstructorRef(item.instructor)),
    };
  }

  /**
   * An instructor must exist, and must be active unless the course already
   * lists them — deactivation blocks new assignments but never breaks an
   * existing course (Epic 5 AC-4).
   */
  private async resolveInstructor(
    instructorId: string,
    existing: CourseInstructor[],
    field: string,
  ): Promise<Instructor> {
    const instructor = await this.instructorsService.findById(instructorId);

    if (!instructor) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { [field]: `notExists:${instructorId}` },
      });
    }

    const alreadyAssigned = existing.some(
      (row) => row.instructor.id === instructorId,
    );

    if (!instructor.isActive && !alreadyAssigned) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { [field]: `inactive:${instructorId}` },
      });
    }

    return instructor;
  }
}
