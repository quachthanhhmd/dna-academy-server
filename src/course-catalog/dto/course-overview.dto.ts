import { ApiProperty } from '@nestjs/swagger';
import { MasterDataRefDto } from './course-card.dto';

export class CourseInstructorDto {
  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String, nullable: true })
  fullName: string | null;

  @ApiProperty({ type: String, nullable: true })
  profilePictureUrl: string | null;
}

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

  @ApiProperty({ type: () => CourseInstructorDto, nullable: true })
  instructor: CourseInstructorDto | null;

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
