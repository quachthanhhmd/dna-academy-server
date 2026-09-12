import { ApiProperty } from '@nestjs/swagger';

/** Epic 4.5 §1.3 — the one course group shown on a card. */
export class MyCourseGroupRefDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({
    type: String,
    example: 'Data Science',
    description: 'Already localized by the Epic 6 locale chain.',
  })
  name: string;
}

export class EnrolledCourseRefDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String })
  slug: string;

  @ApiProperty({ type: String, nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ type: String, example: 'vi' })
  language: string;

  @ApiProperty({ type: Number, example: 20 })
  totalLectures: number;

  @ApiProperty({ type: Number, example: 36000 })
  totalDurationSecs: number;

  @ApiProperty({
    type: () => MyCourseGroupRefDto,
    nullable: true,
    description:
      'Lowest displayOrder when the course sits in several groups, ties ' +
      'broken by name, so the label cannot change between two identical ' +
      'requests. Null when the course has no group.',
  })
  courseGroup: MyCourseGroupRefDto | null;
}

/**
 * Epic 4.5 §1.4 — where Continue / Start goes, and the "Next: …" line.
 *
 * One field, two UI slots, on purpose: they are the same lecture and must
 * never disagree. Distinct from `lastLecture*`, which is the last lecture the
 * student *opened* — including a finished one they went back to review.
 */
export class ContinueLectureDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String, example: 'Convolutional Layers' })
  title: string;

  @ApiProperty({ type: String, example: 'Module 4' })
  sectionTitle: string;
}

/** Epic 4.5 §1.5 — completed enrollments only. */
export class MyCourseCertificateDto {
  @ApiProperty({ type: String, example: 'DNA-2026-000118' })
  number: string;

  @ApiProperty({ type: Date, nullable: true })
  issuedAt: Date | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 96,
    description:
      "MAX(score) over the student's submitted quiz attempts for this " +
      'course — their best single quiz, not a course average. Null when the ' +
      'course has no submitted attempts, in which case the client omits the ' +
      'grade row entirely rather than rendering 0%.',
  })
  finalGradePct: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'A+',
    description: 'Null exactly when finalGradePct is null.',
  })
  gradeLabel: string | null;
}

export class MyCourseDto {
  @ApiProperty({ type: String })
  enrollmentId: string;

  @ApiProperty({ type: () => EnrolledCourseRefDto })
  course: EnrolledCourseRefDto;

  @ApiProperty({ type: Date, nullable: true })
  enrollmentDate: Date | null;

  @ApiProperty({ type: Number, example: 45.5 })
  progressPct: number;

  @ApiProperty({ type: String, nullable: true })
  lastLectureId: string | null;

  @ApiProperty({ type: String, nullable: true })
  lastLectureTitle: string | null;

  @ApiProperty({ type: Date, nullable: true })
  lastAccessedAt: Date | null;

  @ApiProperty({
    type: String,
    example: 'in_progress',
    description: 'enrolled | in_progress | completed | cancelled',
  })
  status: string;

  @ApiProperty({ type: Date, nullable: true })
  completedAt: Date | null;

  @ApiProperty({ type: String, nullable: true })
  courseThumbnailUrl: string | null;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the course awards a certificate.',
  })
  hasCertificate: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Set once the enrollment is completed and a certificate exists.',
  })
  certificateId: string | null;

  @ApiProperty({
    type: Boolean,
    description:
      'The course was unpublished after enrolling — the card is read-only.',
  })
  isArchived: boolean;

  @ApiProperty({
    type: Number,
    example: 14,
    description: 'Lectures in this course with progress status completed.',
  })
  completedLectureCount: number;

  @ApiProperty({
    type: () => ContinueLectureDto,
    nullable: true,
    description:
      'Epic 4.5 §1.4. Null when every lecture is done, which is what turns ' +
      'the CTA into Review Content.',
  })
  continueLecture: ContinueLectureDto | null;

  @ApiProperty({
    type: Number,
    example: 8100,
    description:
      'Sum of durationSecs over every lecture not yet completed. 0 when ' +
      'continueLecture is null.',
  })
  remainingDurationSecs: number;

  @ApiProperty({
    type: () => MyCourseCertificateDto,
    nullable: true,
    description: 'Completed enrollments that hold a certificate; else null.',
  })
  certificate: MyCourseCertificateDto | null;
}

/** Epic 4.5 §1.2 — always describes the UNFILTERED set. */
export class MyCoursesCountsDto {
  @ApiProperty({ type: Number, example: 14 })
  all: number;

  @ApiProperty({ type: Number, example: 8 })
  inProgress: number;

  @ApiProperty({ type: Number, example: 6 })
  completed: number;
}

/**
 * Epic 4.5 §1.2 — the dashboard envelope.
 *
 * `counts` is mandatory and always unfiltered: with server-side filtering a
 * page narrowed to `in_progress` cannot know how many `completed` rows exist,
 * so the tab counters would be impossible to render from the page alone.
 * `totalCount` describes the *filtered* set and drives pagination; the two are
 * equal only when `status` is absent.
 */
export class MyCoursesResponseDto {
  @ApiProperty({ type: () => [MyCourseDto] })
  data: MyCourseDto[];

  @ApiProperty({ type: () => MyCoursesCountsDto })
  counts: MyCoursesCountsDto;

  @ApiProperty({ type: Number, description: 'Size of the filtered set.' })
  totalCount: number;

  @ApiProperty({ type: Number, example: 1 })
  page: number;

  @ApiProperty({ type: Number, example: 6 })
  limit: number;

  @ApiProperty({ type: Boolean })
  hasNextPage: boolean;
}

/** Epic 4.5 §1.6 — `GET /students/me/stats`. */
export class StudentStatsDto {
  @ApiProperty({
    type: Number,
    example: 142,
    description:
      'lecture_progress rows with status completed. The design labels the ' +
      'tile "Modules Completed"; the number is lectures, and the API uses ' +
      'the honest name.',
  })
  lecturesCompleted: number;

  @ApiProperty({
    type: Number,
    example: 148.5,
    description:
      'Sum of durationSecs over completed lectures / 3600, one decimal. ' +
      'Deterministic — deliberately not watchDurationSecs.',
  })
  totalStudyHours: number;

  @ApiProperty({ type: Number, example: 6 })
  certificatesCount: number;
}

export class EnrollResponseDto {
  @ApiProperty({ type: String })
  enrollmentId: string;

  @ApiProperty({ type: String, example: 'Enrollment successful' })
  message: string;
}
