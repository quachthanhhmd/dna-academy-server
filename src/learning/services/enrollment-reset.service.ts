import {
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentsService } from '../../enrollments/enrollments.service';
import { LectureProgressesService } from '../../lecture-progresses/lecture-progresses.service';
import { QuizAttemptAnswersService } from '../../quiz-attempt-answers/quiz-attempt-answers.service';
import { QuizAttemptsService } from '../../quiz-attempts/quiz-attempts.service';
import { QuizSavesService } from '../../quiz-saves/quiz-saves.service';
import { ReflectionResponsesService } from '../../reflection-responses/reflection-responses.service';
import { CareerReflectionAnswersService } from '../../career-reflection-answers/career-reflection-answers.service';
import { CertificatesService } from '../../certificates/certificates.service';
import { ResetProgressResultDto } from '../dto/progress.dto';

/**
 * Epic 4.2 §3.2 — `DELETE /admin/enrollments/:id/progress`.
 *
 * One enrollment per (student, course) is enforced by a unique index and
 * nothing cleared progress, so every learning scenario was a one-shot: QA had
 * to mint a new account or a new course for each run. That is why the journey
 * was only exercised end to end once, and why a P0 in it shipped green.
 *
 * **The certificate is deliberately not deleted.** Its number may already be
 * public on the verification page (`STU_CVF_11`), and `issueFor` is idempotent
 * per enrollment, so re-completing the course hands back the same number.
 * Destroying a certificate is a separate, deliberate act.
 */
@Injectable()
export class EnrollmentResetService {
  private readonly logger = new Logger(EnrollmentResetService.name);

  constructor(
    private readonly enrollmentsService: EnrollmentsService,
    private readonly lectureProgressesService: LectureProgressesService,
    private readonly quizAttemptAnswersService: QuizAttemptAnswersService,
    private readonly quizAttemptsService: QuizAttemptsService,
    private readonly quizSavesService: QuizSavesService,
    private readonly reflectionResponsesService: ReflectionResponsesService,
    private readonly careerReflectionAnswersService: CareerReflectionAnswersService,
    private readonly certificatesService: CertificatesService,
  ) {}

  async resetProgress(
    enrollmentId: string,
    actingAdminId: number,
  ): Promise<ResetProgressResultDto> {
    const enrollment = await this.enrollmentsService.findById(enrollmentId);

    if (!enrollment) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'enrollmentNotFound',
      });
    }

    const certificate =
      await this.certificatesService.findByEnrollmentId(enrollmentId);

    // This endpoint destroys student work and will be reached for in
    // production sooner or later, so who did it is on the record.
    this.logger.warn(
      `Admin ${actingAdminId} reset progress for enrollment ${enrollmentId} ` +
        `(student ${enrollment.student?.id}, course ${enrollment.course?.id})`,
    );

    // Answers first: they point at the attempts, so clearing attempts ahead of
    // them either orphans the rows or trips the foreign key.
    await this.quizAttemptAnswersService.removeByEnrollmentId(enrollmentId);
    await this.quizAttemptsService.removeByEnrollmentId(enrollmentId);
    await this.quizSavesService.removeByEnrollmentId(enrollmentId);
    await this.reflectionResponsesService.removeByEnrollmentId(enrollmentId);
    await this.careerReflectionAnswersService.removeByEnrollmentId(
      enrollmentId,
    );
    await this.lectureProgressesService.removeByEnrollmentId(enrollmentId);

    await this.enrollmentsService.update(enrollmentId, {
      status: 'enrolled',
      progressPct: 0,
      startedAt: null,
      completedAt: null,
      lastLecture: null,
    });

    return {
      enrollmentId,
      certificateRetained: certificate?.certificateNumber ?? null,
    };
  }
}
