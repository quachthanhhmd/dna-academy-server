import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoursesService } from '../../courses/courses.service';
import { EnrollmentsService } from '../../enrollments/enrollments.service';
import { LectureProgressesService } from '../../lecture-progresses/lecture-progresses.service';
import { Enrollment } from '../../enrollments/domain/enrollment';
import { Course } from '../../courses/domain/course';
import {
  CourseCurriculumService,
  CurriculumLecture,
} from './course-curriculum.service';
import { LectureContentService } from './lecture-content.service';
import { SequentialLockService } from './sequential-lock.service';
import { LectureViewDto, StartEnrollmentDto } from '../dto/player.dto';

export const PROGRESS_NOT_STARTED = 'not_started';

@Injectable()
export class PlayerService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly curriculumService: CourseCurriculumService,
    private readonly lectureProgressesService: LectureProgressesService,
    private readonly lectureContentService: LectureContentService,
    private readonly sequentialLockService: SequentialLockService,
  ) {}

  /** Epic 4 v2 §2.3 — `POST /enrollments/:id/start`. */
  async startEnrollment(
    enrollmentId: Enrollment['id'],
    studentId: number,
  ): Promise<StartEnrollmentDto> {
    const enrollment = await this.enrollmentsService.findById(enrollmentId);

    if (!enrollment) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'enrollmentNotFound',
      });
    }

    if (enrollment.student.id !== studentId) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        error: 'notYourEnrollment',
      });
    }

    // Idempotent: re-opening the player must not reset startedAt.
    if (enrollment.status !== 'enrolled') {
      return {
        status: enrollment.status,
        startedAt: enrollment.startedAt ?? null,
      };
    }

    const startedAt = new Date();
    await this.enrollmentsService.update(enrollmentId, {
      status: 'in_progress',
      startedAt,
      lastAccessedAt: startedAt,
    });

    return { status: 'in_progress', startedAt };
  }

  /** Epic 4 v2 §2.3 — `GET /courses/:slug/lectures/:lectureId`. */
  async loadLecture(
    slug: string,
    lectureId: string,
    studentId: number,
  ): Promise<LectureViewDto> {
    const course = await this.findPublishedCourse(slug);

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

    const ordered = await this.curriculumService.orderedLectures(course.id);
    const lecture = this.findLectureOrThrow(ordered, lectureId);

    const progressRows = await this.lectureProgressesService.findByEnrollmentId(
      enrollment.id,
    );
    const statusByLecture = new Map(
      progressRows.map((row) => [row.lecture.id, row.status]),
    );

    this.sequentialLockService.assertUnlocked(
      course.requiresSequentialCompletion,
      ordered,
      lectureId,
      statusByLecture,
    );

    const own = progressRows.find((row) => row.lecture.id === lectureId);

    // Powers "Continue Learning" on My Courses.
    await this.enrollmentsService.update(enrollment.id, {
      lastLecture: { id: lectureId },
      lastAccessedAt: new Date(),
    });

    return {
      ...this.baseView(lecture, ordered),
      enrollmentId: enrollment.id,
      contentPayload: await this.lectureContentService.payloadFor(
        lectureId,
        lecture.lectureType,
        enrollment.id,
      ),
      isLocked: false,
      lockReason: null,
      progressStatus: own?.status ?? PROGRESS_NOT_STARTED,
      watchDurationSecs: own?.watchDurationSecs ?? 0,
    };
  }

  /**
   * Epic 4 v2 §2.3 — `GET /courses/:slug/preview-lectures/:lectureId`.
   * No auth, no enrollment, no sequential lock and no progress writes.
   */
  async previewLecture(
    slug: string,
    lectureId: string,
  ): Promise<LectureViewDto> {
    const course = await this.findPublishedCourse(slug);
    const ordered = await this.curriculumService.orderedLectures(course.id);
    const lecture = this.findLectureOrThrow(ordered, lectureId);

    if (!lecture.isPreview) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        code: 'NOT_A_PREVIEW_LECTURE',
      });
    }

    return {
      ...this.baseView(lecture, ordered),
      enrollmentId: null,
      contentPayload: await this.lectureContentService.payloadFor(
        lectureId,
        lecture.lectureType,
      ),
      isLocked: false,
      lockReason: null,
      progressStatus: PROGRESS_NOT_STARTED,
      watchDurationSecs: 0,
    };
  }

  private baseView(lecture: CurriculumLecture, ordered: CurriculumLecture[]) {
    return {
      lectureId: lecture.id,
      title: lecture.title,
      // v2.2 — never falls back to course.shortDescription; null means the
      // FE hides the block.
      description: lecture.description ?? null,
      lectureType: lecture.lectureType,
      durationSecs: lecture.durationSecs,
      isPreview: lecture.isPreview,
      requiresCompletion: lecture.requiresCompletion,
      sectionId: lecture.section.id,
      sectionTitle: lecture.section.title,
      ...CourseCurriculumService.neighbours(ordered, lecture.id),
    };
  }

  private findLectureOrThrow(
    ordered: CurriculumLecture[],
    lectureId: string,
  ): CurriculumLecture {
    const lecture = ordered.find((item) => item.id === lectureId);

    if (!lecture) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'lectureNotFound',
      });
    }

    return lecture;
  }

  private async findPublishedCourse(slug: string): Promise<Course> {
    const course = await this.coursesService.findBySlug(slug);

    if (!course || course.status !== 'published') {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'courseNotFound',
      });
    }

    return course;
  }
}
