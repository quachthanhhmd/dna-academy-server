import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InstructorsService } from '../instructors/instructors.service';
import { CourseInstructorsService } from '../course-instructors/course-instructors.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Instructor } from '../instructors/domain/instructor';
import { InstructorFullStatsDto } from './dto/instructor-response.dto';

/**
 * Epic 5 §2.1.5 proposes DB triggers for the denormalized counters. We instead
 * recompute them here — on every assignment change and on every stats read —
 * so the arithmetic stays in one testable place and can never silently drift
 * out of sync with a trigger definition nobody remembers to update.
 */
@Injectable()
export class InstructorStatsService {
  constructor(
    private readonly instructorsService: InstructorsService,
    private readonly courseInstructorsService: CourseInstructorsService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  async recompute(
    instructorId: Instructor['id'],
  ): Promise<InstructorFullStatsDto> {
    const instructor = await this.instructorsService.findById(instructorId);

    if (!instructor) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'instructorNotFound',
      });
    }

    return this.recomputeFor(instructorId);
  }

  /**
   * Batch variant used after a course's assignments change. Instructors that
   * disappeared in the meantime are skipped rather than failing the batch —
   * the course save has already been committed by then.
   */
  async recomputeMany(instructorIds: Instructor['id'][]): Promise<void> {
    for (const instructorId of new Set(instructorIds)) {
      const instructor = await this.instructorsService.findById(instructorId);

      if (!instructor) {
        continue;
      }

      await this.recomputeFor(instructorId);
    }
  }

  private async recomputeFor(
    instructorId: Instructor['id'],
  ): Promise<InstructorFullStatsDto> {
    const assignments =
      await this.courseInstructorsService.findByInstructorId(instructorId);
    const courses = assignments.map((assignment) => assignment.course);

    const totalCourses = courses.length;
    const publishedCourses = courses.filter(
      (course) => course.status === 'published',
    );

    const totalStudents = totalCourses
      ? await this.enrollmentsService.countDistinctStudentsByCourseIds(
          courses.map((course) => course.id),
        )
      : 0;

    const avgRating = this.weightedAvgRating(publishedCourses);

    await this.instructorsService.update(instructorId, {
      totalCourses,
      totalStudents,
      avgRating,
    });

    return {
      totalCourses,
      publishedCourses: publishedCourses.length,
      totalStudents,
      avgRating,
    };
  }

  /**
   * Enrollment-weighted mean over the rated published courses, so a 5-star
   * course with 3 students cannot outweigh a 4-star course with 3,000. When
   * none of the rated courses has an enrollment yet, every course counts once.
   */
  private weightedAvgRating(
    courses: { avgRating?: number | null; totalEnrollments?: number }[],
  ): number | null {
    const rated = courses.filter(
      (course) => course.avgRating !== null && course.avgRating !== undefined,
    );

    if (!rated.length) {
      return null;
    }

    const totalWeight = rated.reduce(
      (sum, course) => sum + (course.totalEnrollments ?? 0),
      0,
    );

    const mean = totalWeight
      ? rated.reduce(
          (sum, course) =>
            sum + (course.avgRating as number) * (course.totalEnrollments ?? 0),
          0,
        ) / totalWeight
      : rated.reduce((sum, course) => sum + (course.avgRating as number), 0) /
        rated.length;

    // The column is numeric(3,2); round here so the value we return matches
    // the value that will come back out of Postgres on the next read.
    return Math.round(mean * 100) / 100;
  }
}
