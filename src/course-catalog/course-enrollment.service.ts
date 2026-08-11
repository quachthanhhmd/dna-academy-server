import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CoursesService } from '../courses/courses.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { EnrollResponseDto, MyCourseDto } from './dto/my-course.dto';

export const ENROLLMENT_SOURCE_ORGANIC = 'organic';
export const ENROLLMENT_STATUS_ENROLLED = 'enrolled';

@Injectable()
export class CourseEnrollmentService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  async enroll(slug: string, studentId: number): Promise<EnrollResponseDto> {
    const course = await this.coursesService.findBySlug(slug);

    if (!course || course.status !== 'published') {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'courseNotFound',
      });
    }

    if (!course.enrollmentOpen) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { course: 'enrollmentClosed' },
      });
    }

    const existing = await this.enrollmentsService.findByStudentAndCourse(
      studentId,
      course.id,
    );

    if (existing) {
      throw new ConflictException({ code: 'ALREADY_ENROLLED' });
    }

    // EnrollmentsService.create resolves and validates both refs by id, so
    // passing bare ids here is enough — no need to re-fetch them first.
    const enrollment = await this.enrollmentsService.create({
      student: { id: studentId },
      course: { id: course.id },
      status: ENROLLMENT_STATUS_ENROLLED,
      enrollmentDate: new Date(),
      enrollmentSource: ENROLLMENT_SOURCE_ORGANIC,
      progressPct: 0,
    });

    await this.coursesService.update(course.id, {
      totalEnrollments: (course.totalEnrollments ?? 0) + 1,
    });

    return {
      enrollmentId: enrollment.id,
      message: 'Enrollment successful',
    };
  }

  async findMyCourses(studentId: number): Promise<MyCourseDto[]> {
    const enrollments =
      await this.enrollmentsService.findByStudentId(studentId);

    return enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        slug: enrollment.course.slug,
        thumbnailUrl: enrollment.course.thumbnailUrl ?? null,
      },
      enrollmentDate: enrollment.enrollmentDate ?? null,
      progressPct: enrollment.progressPct ?? 0,
      lastLectureId: enrollment.lastLecture?.id ?? null,
      lastLectureTitle: enrollment.lastLecture?.title ?? null,
      lastAccessedAt: enrollment.lastAccessedAt ?? null,
      status: enrollment.status,
      completedAt: enrollment.completedAt ?? null,
    }));
  }
}
