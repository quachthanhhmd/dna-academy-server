import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCourseAdminDto {
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

  @ApiPropertyOptional({ description: 'User id of the instructor.' })
  @IsOptional()
  @IsInt()
  instructorId?: number;
}
