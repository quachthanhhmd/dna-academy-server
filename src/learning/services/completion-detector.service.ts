import { Injectable, Logger } from '@nestjs/common';
import { EnrollmentsService } from '../../enrollments/enrollments.service';
import { LectureProgressesService } from '../../lecture-progresses/lecture-progresses.service';
import { Enrollment } from '../../enrollments/domain/enrollment';
import { CourseCurriculumService } from './course-curriculum.service';
import { CertificateGeneratorService } from './certificate-generator.service';

export const PROGRESS_STATUS_COMPLETED = 'completed';
export const PROGRESS_STATUS_IN_PROGRESS = 'in_progress';

export type CompletionResult = {
  progressPct: number;
  enrollmentStatus: string;
  completedRequired: number;
  totalRequired: number;
};

/**
 * Epic 4 v2 §2.4 — recomputes enrollment progress from lecture_progress and
 * drives the enrollment status transitions.
 *
 * Progress counts only lectures with `requiresCompletion = true`; optional
 * lectures can be finished without moving the bar, and a course made entirely
 * of optional lectures never auto-completes.
 */
@Injectable()
export class CompletionDetectorService {
  private readonly logger = new Logger(CompletionDetectorService.name);

  constructor(
    private readonly enrollmentsService: EnrollmentsService,
    private readonly curriculumService: CourseCurriculumService,
    private readonly lectureProgressesService: LectureProgressesService,
    private readonly certificateService: CertificateGeneratorService,
  ) {}

  async recompute(enrollmentId: Enrollment['id']): Promise<CompletionResult> {
    const enrollment = await this.enrollmentsService.findById(enrollmentId);

    if (!enrollment) {
      return {
        progressPct: 0,
        enrollmentStatus: 'enrolled',
        completedRequired: 0,
        totalRequired: 0,
      };
    }

    const ordered = await this.curriculumService.orderedLectures(
      enrollment.course.id,
    );
    const required = ordered.filter((lecture) => lecture.requiresCompletion);

    const completedIds = new Set(
      (await this.lectureProgressesService.findByEnrollmentId(enrollmentId))
        .filter((row) => row.status === PROGRESS_STATUS_COMPLETED)
        .map((row) => row.lecture.id),
    );

    const completedRequired = required.filter((lecture) =>
      completedIds.has(lecture.id),
    ).length;

    const progressPct = required.length
      ? Math.round((completedRequired / required.length) * 100)
      : 0;

    const wasCompleted = enrollment.status === 'completed';
    const isCompleted =
      required.length > 0 && completedRequired === required.length;

    const recomputed = isCompleted
      ? 'completed'
      : completedIds.size > 0 || enrollment.status === 'in_progress'
        ? PROGRESS_STATUS_IN_PROGRESS
        : enrollment.status;

    // Epic 4.2 §2.4(b) / D8 — once earned, completion is not taken back.
    // `progressPct` may still fall, and is reported honestly: an admin adding
    // a required lecture to a published course legitimately drops it. But the
    // status, the completion date and the certificate stand, because the
    // student did finish the course as it was set when they finished it.
    const enrollmentStatus = wasCompleted ? 'completed' : recomputed;

    const payload: Partial<Enrollment> = {
      progressPct,
      status: enrollmentStatus,
    };

    // Epic 4.2 §2.4(c) — stamped once, ever. The old test was
    // `isCompleted && !wasCompleted`, which was only correct while the status
    // could not go backwards: after a demotion `wasCompleted` was false, so
    // re-completing wrote a second, later date that disagreed with the
    // certificate snapshot the student is actually holding. BUG-02.
    if (isCompleted && !enrollment.completedAt) {
      payload.completedAt = new Date();
    }

    await this.enrollmentsService.update(enrollmentId, payload);

    if (isCompleted && !wasCompleted) {
      try {
        await this.certificateService.issueFor(enrollmentId);
      } catch (error) {
        // The student has finished the course either way — never fail the
        // progress write because certificate issuance had a bad day.
        this.logger.error(
          `Certificate issuance failed for enrollment ${enrollmentId}`,
          error,
        );
      }
    }

    return {
      progressPct,
      enrollmentStatus,
      completedRequired,
      totalRequired: required.length,
    };
  }
}
