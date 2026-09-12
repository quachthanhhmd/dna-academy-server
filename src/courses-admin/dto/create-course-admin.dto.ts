import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCourseAdminDto {
  @ApiProperty({
    example: 'DNA-101',
    description:
      'Human-readable course code, unique across all courses. Distinct from ' +
      'the generated UUID `id`. Duplicates are rejected with 422 ' +
      '{ errors: { courseId: "alreadyExists" } }.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  courseId: string;

  @ApiProperty({ example: 'Intro to TypeScript' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Validated against the YouTube oEmbed API before saving.',
  })
  @IsOptional()
  @IsString()
  introVideoUrl?: string;

  @ApiProperty({ example: 'en' })
  @IsNotEmpty()
  @IsString()
  language: string;

  @ApiProperty({ example: 0, description: '0 means a free course.' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty()
  @IsBoolean()
  hasCertificate: boolean;

  @ApiProperty()
  @IsBoolean()
  enrollmentOpen: boolean;

  @ApiPropertyOptional({
    default: false,
    description:
      'Epic 4 v2 — when true the player refuses a lecture until the previous ' +
      'required one is completed.',
  })
  @IsOptional()
  @IsBoolean()
  requiresSequentialCompletion?: boolean;

  @ApiPropertyOptional({
    description: 'master_data_code id from the course_level group.',
  })
  @IsOptional()
  @IsUUID()
  levelId?: string;

  @ApiPropertyOptional({
    description: 'master_data_code id from the course_category group.',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'instructors.id of the primary instructor. Optional while the course ' +
      'is a draft, but required to publish it.',
  })
  @IsOptional()
  @IsUUID()
  primaryInstructorId?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'instructors.id list of co-instructors. Must not contain ' +
      'primaryInstructorId, and every id must belong to an active instructor.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  coInstructorIds?: string[];
}
