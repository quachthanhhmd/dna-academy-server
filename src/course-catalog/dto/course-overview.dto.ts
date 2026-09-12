import { ApiProperty } from '@nestjs/swagger';
import { MasterDataRefDto } from './course-card.dto';
import { InstructorProfileDto } from '../../instructors/dto/instructor-profile.dto';

export class CurriculumLectureDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String, example: 'video' })
  lectureType: string;

  @ApiProperty({ type: Number, example: 300 })
  durationSecs: number;

  @ApiProperty({
    type: Boolean,
    description: 'Free preview lecture — playable without enrolling',
  })
  isPreview: boolean;

  @ApiProperty({ type: Number })
  displayOrder: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'completed',
    enum: ['not_started', 'in_progress', 'completed'],
    description:
      'Epic 4 v2.2 — the sidebar tick mark. Null for a caller who is not ' +
      'enrolled; the FE must render from this, not from client state, so a ' +
      'reload keeps the marks.',
  })
  progressStatus: string | null;

  @ApiProperty({
    type: Boolean,
    description:
      'Epic 4.3 §2.2 — the only lock authority; render the lock icon from ' +
      'this and never from isPreview. Not enrolled (no token, cancelled, or ' +
      'simply not enrolled): true for every non-preview lecture, whether or ' +
      'not the course is sequential. Enrolled: true only when the sequential ' +
      'rule blocks it.',
  })
  isLocked: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    enum: ['PREVIOUS_LECTURE_INCOMPLETE', 'NOT_ENROLLED'],
    description:
      'Why isLocked is true. Non-null exactly when isLocked is true — ' +
      'neither ever appears without the other.',
  })
  lockReason: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Epic 4.3 §2.3 — the lecture that must be finished first. Non-null ' +
      'exactly when lockReason is PREVIOUS_LECTURE_INCOMPLETE, so the ' +
      'overview can name the blocker and link to it instead of just saying ' +
      '"locked". Null for a guest: there is no predecessor to name when the ' +
      'lock is simply "not enrolled".',
  })
  requiredLectureId: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Epic 4 v2.2 — resume position for video lectures. Null for a caller ' +
      'who is not enrolled, 0 when nothing has been watched.',
  })
  watchDurationSecs: number | null;
}

export class CurriculumSectionDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: Number })
  displayOrder: number;

  @ApiProperty({ type: () => [CurriculumLectureDto] })
  lectures: CurriculumLectureDto[];
}

export class CourseOverviewDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  slug: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  shortDescription: string | null;

  @ApiProperty({ type: String, nullable: true })
  fullDescription: string | null;

  @ApiProperty({ type: String, nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ type: String, nullable: true })
  introVideoUrl: string | null;

  @ApiProperty({ type: () => InstructorProfileDto, nullable: true })
  primaryInstructor: InstructorProfileDto | null;

  @ApiProperty({ type: () => [InstructorProfileDto] })
  coInstructors: InstructorProfileDto[];

  @ApiProperty({ type: () => MasterDataRefDto, nullable: true })
  level: MasterDataRefDto | null;

  @ApiProperty({ type: () => MasterDataRefDto, nullable: true })
  category: MasterDataRefDto | null;

  @ApiProperty({ type: String, example: 'vi' })
  language: string;

  @ApiProperty({ type: Number })
  totalDurationSecs: number;

  @ApiProperty({ type: Number })
  totalSections: number;

  @ApiProperty({ type: Number })
  totalLectures: number;

  @ApiProperty({ type: Number })
  price: number;

  @ApiProperty({ type: Boolean })
  isFree: boolean;

  @ApiProperty({ type: Boolean })
  hasCertificate: boolean;

  @ApiProperty({
    type: Boolean,
    description:
      'Epic 4 v2 — when true the FE shows the sequential-completion notice ' +
      'and the player enforces lecture order.',
  })
  requiresSequentialCompletion: boolean;

  @ApiProperty({ type: Number, nullable: true })
  avgRating: number | null;

  @ApiProperty({ type: Number })
  totalEnrollments: number;

  @ApiProperty({ type: [String] })
  learningOutcomes: string[];

  @ApiProperty({ type: [String] })
  requirements: string[];

  @ApiProperty({ type: [String] })
  targetLearners: string[];

  @ApiProperty({ type: [String], description: 'course_group master data ids' })
  groupIds: string[];

  @ApiProperty({ type: () => [CurriculumSectionDto] })
  curriculum: CurriculumSectionDto[];

  @ApiProperty({
    type: Boolean,
    description: 'True when the caller has an enrollment for this course',
  })
  isEnrolled: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Raw enrollment status (enrolled | in_progress | completed | cancelled), null when not enrolled or unauthenticated',
    example: 'in_progress',
  })
  enrollmentStatus: string | null;

  @ApiProperty({ type: String, nullable: true })
  enrollmentId: string | null;
}
