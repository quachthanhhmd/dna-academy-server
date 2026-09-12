import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CertificatesService } from '../../certificates/certificates.service';
import { EnrollmentsService } from '../../enrollments/enrollments.service';
import { QuizAttemptsService } from '../../quiz-attempts/quiz-attempts.service';
import { Certificate } from '../../certificates/domain/certificate';
import { Enrollment } from '../../enrollments/domain/enrollment';

export const CERTIFICATE_PREFIX = 'DNA';

/**
 * Epic 4 v2 §2.4 / §7 Q2 — issues the certificate record on completion.
 *
 * V1 stores the number and the snapshots only; no PDF is rendered, so the API
 * carries no headless-browser dependency. `certificate.file` stays null and a
 * renderer can be added later without a schema change.
 */
@Injectable()
export class CertificateGeneratorService {
  constructor(
    private readonly certificatesService: CertificatesService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly quizAttemptsService: QuizAttemptsService,
  ) {}

  /** `DNA-2026-000123` — year of issue plus a zero-padded per-year sequence. */
  static formatNumber(year: number, sequence: number): string {
    return `${CERTIFICATE_PREFIX}-${year}-${String(sequence).padStart(6, '0')}`;
  }

  async issueFor(enrollmentId: Enrollment['id']): Promise<Certificate> {
    const existing =
      await this.certificatesService.findByEnrollmentId(enrollmentId);

    // Idempotent: a re-completion must not mint a second number.
    if (existing) {
      return existing;
    }

    const enrollment = await this.findEnrollmentOrThrow(enrollmentId);

    const year = new Date().getFullYear();
    // From a Postgres sequence, not a row count — two students completing at
    // the same instant must not be handed the same number.
    const sequence = await this.certificatesService.nextSequenceValue();

    return this.certificatesService.create({
      enrollment: { id: enrollmentId } as Enrollment,
      student: enrollment.student,
      course: enrollment.course,
      certificateNumber: CertificateGeneratorService.formatNumber(
        year,
        sequence,
      ),
      // Snapshots: the certificate must keep reading correctly even if the
      // student renames themselves or the course is retitled later.
      studentNameSnapshot: enrollment.student.fullName,
      courseTitleSnapshot: enrollment.course.title,
      completionDate: enrollment.completedAt ?? new Date(),
      // Epic 4.5 §1.5 — frozen here, once, and never recomputed. Read live it
      // would change under a student who retook a quiz after finishing, while
      // the certificate beside it stood still.
      finalGradePct: await this.bestSubmittedScore(enrollmentId),
      issuedAt: new Date(),
      file: null,
    });
  }

  /**
   * The student's best submitted quiz score for this enrollment, or null when
   * they submitted none — which the API renders as no grade row rather than
   * as zero.
   */
  private async bestSubmittedScore(
    enrollmentId: Enrollment['id'],
  ): Promise<number | null> {
    const attempts =
      await this.quizAttemptsService.findSubmittedByEnrollmentIds([
        enrollmentId,
      ]);

    const scores = attempts
      .map((attempt) => attempt.score)
      .filter((score): score is number => typeof score === 'number');

    return scores.length ? Math.max(...scores) : null;
  }

  /**
   * Epic 4 v2 §2.3 — `POST /enrollments/:id/certificate/regenerate` (admin).
   *
   * Re-snapshots the student name, course title and completion date from the
   * enrollment as it stands now, which is the point of the endpoint: a name or
   * title corrected after issue should show on the certificate. The number is
   * the certificate's public identity and is deliberately left alone.
   *
   * So is **`finalGradePct`** (Epic 4.5 §1.5): the grade is frozen at issue,
   * regardless of anything the student does afterwards. This endpoint corrects
   * *who* the certificate is for, never *what was earned* — otherwise an admin
   * fixing a misspelt name would silently rewrite the grade too.
   */
  async regenerateFor(enrollmentId: Enrollment['id']): Promise<Certificate> {
    const enrollment = await this.findEnrollmentOrThrow(enrollmentId);

    if (enrollment.status !== 'completed') {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { enrollment: 'notCompleted' },
      });
    }

    const existing =
      await this.certificatesService.findByEnrollmentId(enrollmentId);

    if (!existing) {
      return this.issueFor(enrollmentId);
    }

    const updated = await this.certificatesService.update(existing.id, {
      studentNameSnapshot: enrollment.student.fullName,
      courseTitleSnapshot: enrollment.course.title,
      completionDate: enrollment.completedAt ?? existing.completionDate,
      issuedAt: new Date(),
      // V1 renders nothing, so there is no stored artefact to replace. Once a
      // PDF renderer lands this is where the old file would be swapped out.
      file: null,
    });

    return updated ?? existing;
  }

  private async findEnrollmentOrThrow(
    enrollmentId: Enrollment['id'],
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentsService.findById(enrollmentId);

    if (!enrollment) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'enrollmentNotFound',
      });
    }

    return enrollment;
  }
}
