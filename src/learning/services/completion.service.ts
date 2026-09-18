import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EnrollmentsService } from '../../enrollments/enrollments.service';
import { CertificatesService } from '../../certificates/certificates.service';
import { CourseRatingsService } from '../../course-ratings/course-ratings.service';
import { CoursesService } from '../../courses/courses.service';
import { Enrollment } from '../../enrollments/domain/enrollment';
import { CertificateGeneratorService } from './certificate-generator.service';
import {
  CertificateCourseDto,
  CertificateDto,
  CertificatePathwayDto,
  CertificateResponseDto,
  RatingDto,
} from '../dto/completion.dto';
import { CourseGroupAssignmentsService } from '../../course-group-assignments/course-group-assignments.service';
import { gradeLabelFor } from '../../course-catalog/grade-label';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';

export type RatingInput = { rating: number; reviewText?: string | null };

@Injectable()
export class CompletionService {
  constructor(
    private readonly enrollmentsService: EnrollmentsService,
    private readonly certificatesService: CertificatesService,
    private readonly certificateGenerator: CertificateGeneratorService,
    private readonly courseRatingsService: CourseRatingsService,
    private readonly coursesService: CoursesService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly courseGroupAssignmentsService: CourseGroupAssignmentsService,
  ) {}

  /** Epic 4 v2 §2.3 — `GET /enrollments/:id/certificate`. */
  async getCertificate(
    enrollmentId: string,
    studentId: number,
  ): Promise<CertificateResponseDto> {
    const enrollment = await this.findOwnEnrollment(enrollmentId, studentId);

    return this.buildResponse(enrollment);
  }

  /**
   * Epic 4.1 D6 — both branches of the response.
   *
   * `course` and `progressPct` cost nothing: `enrollment.course` is eager and
   * `findOwnEnrollment` has already loaded the row, so today this data is
   * fetched and then discarded. `pathway` is the single extra query.
   */
  private async buildResponse(
    enrollment: Enrollment,
  ): Promise<CertificateResponseDto> {
    const context = {
      course: {
        id: enrollment.course.id,
        slug: enrollment.course.slug,
        title: enrollment.course.title,
        thumbnailUrl: enrollment.course.thumbnailUrl ?? null,
      } satisfies CertificateCourseDto,
      progressPct: enrollment.progressPct ?? 0,
      lastLectureId: enrollment.lastLecture?.id ?? null,
      pathway: await this.findPathway(enrollment.course.id),
    };

    // Epic 4.2 §2.4(d) / D8 — `ready` keys on the certificate, not on the
    // enrollment status. A certificate that has been issued is never
    // withdrawn: its number may already be public on the verification page,
    // and hiding it took the student's credential away for as long as the
    // enrollment happened to read `in_progress`. BUG-01.
    const existing = await this.certificatesService.findByEnrollmentId(
      enrollment.id,
    );

    if (!existing && enrollment.status !== 'completed') {
      return { ready: false, ...context, certificate: null };
    }

    // Normally issued by CompletionDetectorService; issuing here too covers
    // enrollments completed before this epic shipped.
    const certificate =
      existing ?? (await this.certificateGenerator.issueFor(enrollment.id));

    return {
      ready: true,
      ...context,
      certificate: this.toCertificateDto(certificate),
    };
  }

  /** Epic 4.1 §3.2 — admin re-issue, which returns the same shape. */
  async regenerateCertificate(
    enrollmentId: string,
  ): Promise<CertificateResponseDto> {
    await this.certificateGenerator.regenerateFor(enrollmentId);

    const enrollment = await this.enrollmentsService.findById(enrollmentId);

    if (!enrollment) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'enrollmentNotFound',
      });
    }

    return this.buildResponse(enrollment);
  }

  /**
   * Epic 4.1 D6 — the Explore Pathway card.
   *
   * A course can sit in several groups, so the choice is ordered rather than
   * "whichever row came back first": lowest `displayOrder`, ties broken by
   * name. Otherwise the card can change between two identical requests.
   */
  private async findPathway(
    courseId: string,
  ): Promise<CertificatePathwayDto | null> {
    const assignments =
      await this.courseGroupAssignmentsService.findByCourseId(courseId);

    const groups = assignments
      .map((assignment) => assignment.group)
      .filter((group): group is NonNullable<typeof group> => !!group)
      .sort(
        (a, b) =>
          a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
      );

    const [group] = groups;

    // `name` is localized by MasterDataCodeMapper on the way out of the
    // repository, so the Epic 6 locale chain has already been applied.
    return group ? { groupId: group.id, name: group.name } : null;
  }

  /**
   * The one place a stored certificate becomes the DTO. `regenerate` returns
   * the same shape, and building it twice is how the issuer ends up on one
   * response and not the other.
   */
  toCertificateDto(certificate: {
    id: string;
    certificateNumber: string;
    studentNameSnapshot: string;
    courseTitleSnapshot: string;
    completionDate: Date;
    issuedAt?: Date | null;
    finalGradePct?: number | null;
  }): CertificateDto {
    return {
      id: certificate.id,
      number: certificate.certificateNumber,
      studentName: certificate.studentNameSnapshot,
      courseTitle: certificate.courseTitleSnapshot,
      completionDate: certificate.completionDate,
      issuedAt: certificate.issuedAt ?? null,
      // Epic 4.5 §1.5 — frozen at issue; the same value the dashboard card
      // shows, read from the same column so the two cannot disagree.
      finalGradePct: certificate.finalGradePct ?? null,
      gradeLabel: gradeLabelFor(certificate.finalGradePct),
      // Epic 4.1 §3.2 — printed on the card and echoed by the public
      // verification page, so both read the same configured value.
      issuerName: this.configService.getOrThrow('certificate.issuerName', {
        infer: true,
      }),
      signatureUrl: this.configService.getOrThrow('certificate.signatureUrl', {
        infer: true,
      }),
      // Epic 4.1 D4 — V1 issues the record only; the Download button prints
      // the card client-side. `ready: false` means "course unfinished", never
      // "PDF rendering", so the FE must not poll on it.
      fileUrl: null,
    };
  }

  /** Epic 4 v2 §2.3 — `GET /enrollments/:id/rating`. */
  async getRating(
    enrollmentId: string,
    studentId: number,
  ): Promise<RatingDto | null> {
    await this.findOwnEnrollment(enrollmentId, studentId);

    const rating =
      await this.courseRatingsService.findByEnrollmentId(enrollmentId);

    return rating
      ? {
          rating: rating.rating,
          reviewText: rating.reviewText ?? null,
          reviewStatus: rating.reviewStatus,
          submittedAt: rating.submittedAt ?? null,
        }
      : null;
  }

  /** Epic 4 v2 §2.3 — `POST`/`PUT /enrollments/:id/rating`. */
  async upsertRating(
    enrollmentId: string,
    studentId: number,
    input: RatingInput,
  ): Promise<RatingDto> {
    const enrollment = await this.findOwnEnrollment(enrollmentId, studentId);

    if (enrollment.status !== 'completed') {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { enrollment: 'notCompleted' },
      });
    }

    const reviewText = input.reviewText?.trim() || null;
    // §7 Q5 — free text needs a human; a bare star rating has nothing to moderate.
    const reviewStatus = reviewText ? 'pending' : 'approved';
    const submittedAt = new Date();

    const existing =
      await this.courseRatingsService.findByEnrollmentId(enrollmentId);

    if (existing) {
      await this.courseRatingsService.update(existing.id, {
        rating: input.rating,
        reviewText,
        reviewStatus,
        submittedAt,
      });
    } else {
      await this.courseRatingsService.create({
        enrollment: { id: enrollmentId } as Enrollment,
        student: enrollment.student,
        course: enrollment.course,
        rating: input.rating,
        reviewText,
        reviewStatus,
        submittedAt,
      });
    }

    await this.refreshCourseAverage(enrollment.course.id);

    return { rating: input.rating, reviewText, reviewStatus, submittedAt };
  }

  private async refreshCourseAverage(courseId: string): Promise<void> {
    const { average } =
      await this.courseRatingsService.averageForCourse(courseId);

    await this.coursesService.update(courseId, {
      // course.avgRating is numeric(3,2).
      avgRating: average === null ? null : Math.round(average * 100) / 100,
    });
  }

  private async findOwnEnrollment(
    enrollmentId: string,
    studentId: number,
  ): Promise<Enrollment> {
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

    return enrollment;
  }
}
