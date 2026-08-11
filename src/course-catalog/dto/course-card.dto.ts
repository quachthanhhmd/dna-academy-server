import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ type: String, nullable: true })
  instructorName: string | null;

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
