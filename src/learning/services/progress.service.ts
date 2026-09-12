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
import { LectureProgressesService } from '../../lecture-progresses/lecture-progresses.service';
import { Enrollment } from '../../enrollments/domain/enrollment';
import { Course } from '../../courses/domain/course';
import { Lecture } from '../../lectures/domain/lecture';
import { CourseCurriculumService } from './course-curriculum.service';
import { SequentialLockService } from './sequential-lock.service';
import { CompletionDetectorService } from './completion-detector.service';
import { ProgressResultDto } from '../dto/progress.dto';

export type RecordProgressInput = {
  status: 'in_progress' | 'completed';
  watchDurationSecs?: number;
};

/**
 * Epic 4.2 §2.4(a) / D7 — `not_started → in_progress → completed`, one way.
 *
 * An unranked status sorts below everything, so an unrecognised value stored
 * by some earlier version can always be promoted out of rather than pinning
 * the row forever.
 */
const STATUS_RANK: Record<string, number> = {
  not_started: 0,
  in_progress: 1,
  completed: 2,
};

const rank = (status: string): number => STATUS_RANK[status] ?? -1;

/**
 * The higher of the two. A downward write is a no-op on status — not an
 * error: v2.3 §4.5 already promises re-posting `completed` is idempotent, and
 * answering 409 would break a client that merely reopens a finished lecture.
 *
 * The player pings `in_progress` every time a lecture is opened. Honouring
 * that over a stored `completed` dropped `progressPct`, demoted the enrolment
 * out of `completed`, took the certificate away from the student and — on a
 * sequential course — re-locked everything after it. That was BUG-01.
 */
const highestStatus = (requested: string, existing: string): string =>
  rank(requested) > rank(existing) ? requested : existing;

type ResolvedContext = {
  course: Course;
  lecture: Lecture;
  enrollment: Enrollment;
};

@Injectable()
export class ProgressService {
  constructor(
    private readonly lecturesService: LecturesService,
    private readonly sectionsService: SectionsService,
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly lectureProgressesService: LectureProgressesService,
    private readonly curriculumService: CourseCurriculumService,
    private readonly sequentialLockService: SequentialLockService,
    private readonly completionDetector: CompletionDetectorService,
  ) {}

  /** Epic 4 v2 §2.3 — `POST /lectures/:lectureId/progress`. */
  async record(
    lectureId: string,
    studentId: number,
    input: RecordProgressInput,
  ): Promise<ProgressResultDto> {
    const { course, enrollment } = await this.resolve(lectureId, studentId);

    await this.assertUnlocked(course, enrollment, lectureId);

    const existing =
      await this.lectureProgressesService.findByEnrollmentAndLecture(
        enrollment.id,
        lectureId,
      );

    const status = existing
      ? highestStatus(input.status, existing.status)
      : input.status;
    const completing = status === 'completed';
    // Never move a completion date that has already been earned.
    const completedAt = completing
      ? (existing?.completedAt ?? new Date())
      : (existing?.completedAt ?? null);

    if (existing) {
      await this.lectureProgressesService.update(existing.id, {
        status,
        completedAt,
        // The stray ping still carries a real watch position, so only the
        // status is refused — the rest of the write stands.
        ...(input.watchDurationSecs !== undefined
          ? { watchDurationSecs: input.watchDurationSecs }
          : {}),
      });
    } else {
      await this.lectureProgressesService.create({
        enrollment: { id: enrollment.id } as Enrollment,
        lecture: { id: lectureId } as Lecture,
        status,
        startedAt: new Date(),
        completedAt,
        watchDurationSecs: input.watchDurationSecs ?? 0,
      });
    }

    return this.completionDetector.recompute(enrollment.id);
  }

  /**
   * Epic 4 v2 §2.3 — `PUT /lectures/:lectureId/watch-position`.
   * Deliberately does not recompute course progress: this fires every 15s.
   */
  async saveWatchPosition(
    lectureId: string,
    studentId: number,
    watchDurationSecs: number,
  ): Promise<void> {
    const { enrollment } = await this.resolve(lectureId, studentId);

    const existing =
      await this.lectureProgressesService.findByEnrollmentAndLecture(
        enrollment.id,
        lectureId,
      );

    if (existing) {
      await this.lectureProgressesService.update(existing.id, {
        watchDurationSecs,
      });
      return;
    }

    await this.lectureProgressesService.create({
      enrollment: { id: enrollment.id } as Enrollment,
      lecture: { id: lectureId } as Lecture,
      status: 'in_progress',
      startedAt: new Date(),
      completedAt: null,
      watchDurationSecs,
    });
  }

  private async assertUnlocked(
    course: Course,
    enrollment: Enrollment,
    lectureId: string,
  ): Promise<void> {
    if (!course.requiresSequentialCompletion) {
      return;
    }

    const ordered = await this.curriculumService.orderedLectures(course.id);
    const progressRows = await this.lectureProgressesService.findByEnrollmentId(
      enrollment.id,
    );

    this.sequentialLockService.assertUnlocked(
      true,
      ordered,
      lectureId,
      new Map(progressRows.map((row) => [row.lecture.id, row.status])),
    );
  }

  /** lecture → section → course → this student's enrollment. */
  private async resolve(
    lectureId: string,
    studentId: number,
  ): Promise<ResolvedContext> {
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

    return { course, lecture, enrollment };
  }
}
