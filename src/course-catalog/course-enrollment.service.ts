import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CoursesService } from '../courses/courses.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { CertificatesService } from '../certificates/certificates.service';
import { LectureProgressesService } from '../lecture-progresses/lecture-progresses.service';
import { LecturesService } from '../lectures/lectures.service';
import { CourseGroupAssignmentsService } from '../course-group-assignments/course-group-assignments.service';
import { Enrollment } from '../enrollments/domain/enrollment';
import { gradeLabelFor } from './grade-label';
import {
  EnrollResponseDto,
  MyCourseDto,
  MyCoursesResponseDto,
  StudentStatsDto,
} from './dto/my-course.dto';
import {
  FindMyCoursesDto,
  MY_COURSES_DEFAULT_LIMIT,
} from './dto/find-my-courses.dto';

export const ENROLLMENT_SOURCE_ORGANIC = 'organic';
export const ENROLLMENT_STATUS_ENROLLED = 'enrolled';
export const ENROLLMENT_STATUS_CANCELLED = 'cancelled';

const PROGRESS_COMPLETED = 'completed';
const PROGRESS_IN_PROGRESS = 'in_progress';
const SECONDS_PER_HOUR = 3600;

/**
 * Epic 4.5 §1.2 — the dashboard's single ordering rule.
 *
 * Rank first, then a per-rank recency key, then the enrollment id. The id
 * tiebreak is not decoration: without it two rows with equal keys can swap
 * between requests, and a paginated list then repeats or skips a card.
 */
const STATUS_RANK: Record<string, number> = {
  in_progress: 0,
  enrolled: 1,
  completed: 2,
  cancelled: 3,
};

/** Newest first, with a missing date sorting last (NULLS LAST). */
const recencyKey = (enrollment: Enrollment): number => {
  const date =
    enrollment.status === PROGRESS_IN_PROGRESS
      ? enrollment.lastAccessedAt
      : enrollment.status === PROGRESS_COMPLETED
        ? enrollment.completedAt
        : enrollment.enrollmentDate;

  return date ? new Date(date).getTime() : Number.NEGATIVE_INFINITY;
};

const byDashboardOrder = (a: Enrollment, b: Enrollment): number =>
  (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99) ||
  recencyKey(b) - recencyKey(a) ||
  a.id.localeCompare(b.id);

@Injectable()
export class CourseEnrollmentService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly certificatesService: CertificatesService,
    private readonly lectureProgressesService: LectureProgressesService,
    private readonly lecturesService: LecturesService,
    private readonly courseGroupAssignmentsService: CourseGroupAssignmentsService,
  ) {}

  /**
   * Epic 4 v2 §2.2 — `POST /courses/:slug/enroll`.
   *
   * `idempotencyKey` makes a retried submit safe: with one supplied, finding
   * the student already enrolled returns that enrollment instead of 409, so a
   * double-tapped Enroll button lands on the success path either way. The key
   * itself is not stored — with one active enrollment per (student, course)
   * enforced by `UX_enrollment_active`, the enrollment row is the record of
   * the operation, so there is nothing a stored key would additionally settle.
   */
  async enroll(
    slug: string,
    studentId: number,
    idempotencyKey?: string,
  ): Promise<EnrollResponseDto> {
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

    // A cancelled enrollment does not block a fresh one — the partial unique
    // index UX_enrollment_active is written to allow exactly this, and My
    // Courses offers a Re-enroll CTA on cancelled cards.
    if (existing && existing.status !== ENROLLMENT_STATUS_CANCELLED) {
      if (idempotencyKey) {
        return {
          enrollmentId: existing.id,
          message: 'Already enrolled',
        };
      }

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

  /**
   * Epic 4.5 §1.2 — `GET /students/me/courses`, the My Learning dashboard.
   *
   * Counts are computed over the whole set *before* filtering: with
   * server-side filtering (D3) a page narrowed to one tab cannot know how many
   * rows the other tabs hold, so the counters would be unrenderable from the
   * page alone.
   *
   * Filtering, sorting and slicing run in memory. A student with hundreds of
   * enrollments is not a case worth a second query today; the batched loads
   * below are what actually mattered, because they used to be per card.
   */
  async findMyCourses(
    studentId: number,
    query: FindMyCoursesDto = {},
  ): Promise<MyCoursesResponseDto> {
    const enrollments =
      await this.enrollmentsService.findByStudentId(studentId);

    const counts = {
      all: enrollments.length,
      inProgress: enrollments.filter(
        (item) => item.status === PROGRESS_IN_PROGRESS,
      ).length,
      completed: enrollments.filter(
        (item) => item.status === PROGRESS_COMPLETED,
      ).length,
    };

    const filtered = query.status
      ? enrollments.filter((item) => item.status === query.status)
      : [...enrollments];

    filtered.sort(byDashboardOrder);

    const page = query.page ?? 1;
    const limit = query.limit ?? MY_COURSES_DEFAULT_LIMIT;
    const start = (page - 1) * limit;
    const pageRows = filtered.slice(start, start + limit);

    const cards = await this.buildCards(pageRows);

    return {
      data: cards,
      counts,
      totalCount: filtered.length,
      page,
      limit,
      hasNextPage: start + limit < filtered.length,
    };
  }

  /**
   * Epic 4.5 §1.6 — `GET /students/me/stats`.
   *
   * Aggregates over every enrollment, not a page. `totalStudyHours` is summed
   * from lecture durations rather than `watchDurationSecs` (D2) so the number
   * is deterministic: the same completed lectures always give the same total.
   */
  async findMyStats(studentId: number): Promise<StudentStatsDto> {
    const enrollments =
      await this.enrollmentsService.findByStudentId(studentId);

    if (!enrollments.length) {
      return { lecturesCompleted: 0, totalStudyHours: 0, certificatesCount: 0 };
    }

    const enrollmentIds = enrollments.map((item) => item.id);
    const courseIds = [...new Set(enrollments.map((item) => item.course.id))];

    const [progressRows, certificates, lecturesByCourse] = await Promise.all([
      this.lectureProgressesService.findByEnrollmentIds(enrollmentIds),
      this.certificatesService.findByEnrollmentIds(enrollmentIds),
      this.lecturesService.findOrderedByCourseIds(courseIds),
    ]);

    const durationByLecture = new Map<string, number>();
    for (const lectures of lecturesByCourse.values()) {
      for (const lecture of lectures) {
        durationByLecture.set(lecture.id, lecture.durationSecs ?? 0);
      }
    }

    const completed = progressRows.filter(
      (row) => row.status === PROGRESS_COMPLETED,
    );
    const seconds = completed.reduce(
      (total, row) => total + (durationByLecture.get(row.lecture.id) ?? 0),
      0,
    );

    return {
      lecturesCompleted: completed.length,
      totalStudyHours: Math.round((seconds / SECONDS_PER_HOUR) * 10) / 10,
      certificatesCount: certificates.length,
    };
  }

  /**
   * The per-card projection. Every lookup here is batched across the page —
   * this used to be a `Promise.all` over the rows with a certificate query
   * inside it, which is one query per card (AC-16).
   */
  private async buildCards(enrollments: Enrollment[]): Promise<MyCourseDto[]> {
    if (!enrollments.length) {
      return [];
    }

    const enrollmentIds = enrollments.map((item) => item.id);
    const courseIds = [...new Set(enrollments.map((item) => item.course.id))];

    const [progressRows, certificates, lecturesByCourse, groups] =
      await Promise.all([
        this.lectureProgressesService.findByEnrollmentIds(enrollmentIds),
        this.certificatesService.findByEnrollmentIds(enrollmentIds),
        this.lecturesService.findOrderedByCourseIds(courseIds),
        this.courseGroupAssignmentsService.findPrimaryGroupByCourseIds(
          courseIds,
        ),
      ]);

    // Progress is keyed by enrollment *and* lecture: two enrollments can hold
    // a row for the same lecture id, and one card must not read the other's.
    const statusByKey = new Map(
      progressRows.map((row) => [
        `${row.enrollment.id}:${row.lecture.id}`,
        row.status,
      ]),
    );
    const certificateByEnrollment = new Map(
      certificates.map((certificate) => [
        certificate.enrollment.id,
        certificate,
      ]),
    );

    return enrollments.map((enrollment) => {
      const lectures = lecturesByCourse.get(enrollment.course.id) ?? [];
      const statusOf = (lectureId: string) =>
        statusByKey.get(`${enrollment.id}:${lectureId}`);

      const unfinished = lectures.filter(
        (lecture) => statusOf(lecture.id) !== PROGRESS_COMPLETED,
      );

      // §1.4 — resume where the student stopped, else the next unfinished
      // lecture, else nothing. `lastLecture` keeps its own meaning: the last
      // lecture *opened*, including one revisited after finishing it.
      const resumable =
        enrollment.lastLecture &&
        statusOf(enrollment.lastLecture.id) === PROGRESS_IN_PROGRESS
          ? lectures.find(
              (lecture) => lecture.id === enrollment.lastLecture?.id,
            )
          : undefined;
      const next = resumable ?? unfinished[0];

      const certificate = certificateByEnrollment.get(enrollment.id);
      // Epic 4.5 §1.5 — read the frozen value off the certificate. It used to
      // be MAX(score) recomputed here, which made the grade beside a
      // certificate move whenever the student retook a quiz.
      const grade = certificate?.finalGradePct ?? null;

      return {
        enrollmentId: enrollment.id,
        course: {
          id: enrollment.course.id,
          title: enrollment.course.title,
          slug: enrollment.course.slug,
          thumbnailUrl: enrollment.course.thumbnailUrl ?? null,
          language: enrollment.course.language,
          totalLectures: enrollment.course.totalLectures ?? 0,
          totalDurationSecs: enrollment.course.totalDurationSecs ?? 0,
          courseGroup: groups.get(enrollment.course.id) ?? null,
        },
        enrollmentDate: enrollment.enrollmentDate ?? null,
        progressPct: enrollment.progressPct ?? 0,
        lastLectureId: enrollment.lastLecture?.id ?? null,
        lastLectureTitle: enrollment.lastLecture?.title ?? null,
        lastAccessedAt: enrollment.lastAccessedAt ?? null,
        status: enrollment.status,
        completedAt: enrollment.completedAt ?? null,
        courseThumbnailUrl: enrollment.course.thumbnailUrl ?? null,
        hasCertificate: enrollment.course.hasCertificate ?? false,
        certificateId: certificate?.id ?? null,
        // Epic 4 v2 §5.3 — the course was pulled after the student enrolled.
        isArchived: enrollment.course.status !== 'published',
        completedLectureCount: lectures.length - unfinished.length,
        continueLecture: next
          ? {
              id: next.id,
              title: next.title,
              sectionTitle: next.sectionTitle,
            }
          : null,
        remainingDurationSecs: unfinished.reduce(
          (total, lecture) => total + (lecture.durationSecs ?? 0),
          0,
        ),
        certificate: certificate
          ? {
              number: certificate.certificateNumber,
              issuedAt: certificate.issuedAt ?? null,
              finalGradePct: grade,
              gradeLabel: gradeLabelFor(grade),
            }
          : null,
      };
    });
  }
}
