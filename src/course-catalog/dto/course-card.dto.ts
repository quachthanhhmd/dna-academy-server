import { ApiProperty } from '@nestjs/swagger';
import { InstructorRefDto } from '../../instructors/dto/instructor-profile.dto';

export class MasterDataRefDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String, example: 'Beginner' })
  name: string;
}

export class CourseCardDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String, example: 'intro-to-career-planning' })
  slug: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ type: String, nullable: true })
  shortDescription: string | null;

  @ApiProperty({ type: () => InstructorRefDto, nullable: true })
  primaryInstructor: InstructorRefDto | null;

  @ApiProperty({
    type: Number,
    description: 'Number of co-instructors, for the "+ N others" card label.',
  })
  coInstructorCount: number;

  @ApiProperty({ type: () => MasterDataRefDto, nullable: true })
  level: MasterDataRefDto | null;

  @ApiProperty({ type: Number, example: 3600 })
  totalDurationSecs: number;

  @ApiProperty({ type: Number, example: 0 })
  price: number;

  @ApiProperty({ type: Boolean })
  isFree: boolean;

  @ApiProperty({ type: Number, nullable: true, example: 4.5 })
  avgRating: number | null;

  @ApiProperty({ type: Number, example: 128 })
  totalEnrollments: number;

  // ---------------------------------------------------------------------
  // Epic 4.4 §1.3 — card additions.
  // ---------------------------------------------------------------------

  @ApiProperty({ type: String, example: 'vi' })
  language: string;

  @ApiProperty({
    type: [String],
    description:
      'course_group master_data_code ids assigned to this course, so the ' +
      'category pills can show their active state without a second call. ' +
      'Empty array when the course is in no group.',
  })
  groupIds: string[];

  @ApiProperty({
    type: Boolean,
    description: 'True when at least one lecture is marked isPreview.',
  })
  hasPreview: boolean;

  @ApiProperty({
    type: Boolean,
    description:
      'Whether the *calling* student holds a live (non-cancelled) enrollment. ' +
      'Always false for an anonymous caller — the endpoint is public and ' +
      'simply does not know. Because this varies by caller the response ' +
      'carries `Vary: Authorization`; a client cache must be keyed on ' +
      'identity too (§1.4 option A).',
  })
  isEnrolled: boolean;
}

export class CourseCatalogResponseDto {
  @ApiProperty({ type: () => [CourseCardDto] })
  data: CourseCardDto[];

  @ApiProperty({ type: Number, description: 'Total rows matching the filters' })
  totalCount: number;

  @ApiProperty({ type: Number })
  page: number;

  @ApiProperty({ type: Number })
  limit: number;

  @ApiProperty({ type: Boolean })
  hasNextPage: boolean;
}
