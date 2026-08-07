import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export const LECTURE_TYPES = [
  'video',
  'article',
  'pdf_document',
  'quiz',
  'reflection',
] as const;

export class CreateLectureAdminDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: LECTURE_TYPES })
  @IsIn(LECTURE_TYPES)
  lectureType: string;

  @ApiProperty({ description: 'Seconds' })
  @IsInt()
  @Min(0)
  durationSecs: number;

  @ApiProperty()
  @IsBoolean()
  isPreview: boolean;

  @ApiProperty()
  @IsBoolean()
  requiresCompletion: boolean;

  @ApiProperty()
  @IsInt()
  displayOrder: number;
}
