import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LecturesService } from '../../lectures/lectures.service';
import { SectionsService } from '../../sections/sections.service';
import { CoursesService } from '../../courses/courses.service';
import { EnrollmentsService } from '../../enrollments/enrollments.service';
import { Enrollment } from '../../enrollments/domain/enrollment';
import { Course } from '../../courses/domain/course';
import { Lecture } from '../../lectures/domain/lecture';

export type LectureEnrollmentContext = {
  lecture: Lecture;
  course: Course;
  enrollment: Enrollment;
};

/**
 * Resolves lecture → section → course → the caller's enrollment, which every
 * learning endpoint needs before it may touch anything.
 */
@Injectable()
export class EnrollmentResolverService {
  constructor(
    private readonly lecturesService: LecturesService,
    private readonly sectionsService: SectionsService,
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  async resolveEnrollment(
    lectureId: string,
    studentId: number,
  ): Promise<LectureEnrollmentContext> {
    const lecture = await this.lecturesService.findById(lectureId);

    if (!lecture) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'lectureNotFound',
      });
    }

    const section = await this.sectionsService.findById(lecture.section.id);
    const course = section
      ? await this.coursesService.findById(section.course.id)
      : null;

    if (!course) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'courseNotFound',
      });
    }

    const enrollment = await this.enrollmentsService.findByStudentAndCourse(
      studentId,
      course.id,
    );

    if (!enrollment || enrollment.status === 'cancelled') {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        code: 'NOT_ENROLLED',
      });
    }

    return { lecture, course, enrollment };
  }
}
