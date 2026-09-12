import { UserDto } from '../../users/dto/user.dto';

import { MasterDataCodeDto } from '../../master-data-codes/dto/master-data-code.dto';

import {
  // decorators here

  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsNotEmptyObject,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

import {
  // decorators here
  Type,
} from 'class-transformer';

export class CreateCourseDto {
  @ApiProperty({
    required: false,
    type: () => String,
    example: 'DNA-101',
  })
  @IsOptional()
  @IsString()
  courseId?: string | null;

  createdBy?: UserDto | null;

  publishedBy?: UserDto | null;

  publishedAt?: Date | null;

  avgRating?: number | null;

  totalEnrollments?: number;

  totalDurationSecs?: number;

  totalLectures?: number;

  totalSections?: number;

  @ApiProperty({
    required: false,
    type: () => MasterDataCodeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MasterDataCodeDto)
  @IsNotEmptyObject()
  category?: MasterDataCodeDto | null;

  @ApiProperty({
    required: false,
    type: () => MasterDataCodeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MasterDataCodeDto)
  @IsNotEmptyObject()
  level?: MasterDataCodeDto | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  status: string;

  @ApiProperty({
    required: true,
    type: () => Boolean,
  })
  @IsBoolean()
  enrollmentOpen: boolean;

  @ApiProperty({
    required: true,
    type: () => Boolean,
  })
  @IsBoolean()
  hasCertificate: boolean;

  @ApiProperty({
    required: true,
    type: () => Boolean,
  })
  @IsBoolean()
  isFree: boolean;

  @ApiProperty({
    required: true,
    type: () => Number,
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  language: string;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  introVideoUrl?: string | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  fullDescription?: string | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  shortDescription?: string | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  title: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  slug: string;

  // Don't forget to use the class-validator decorators in the DTO properties.

  @ApiProperty({ required: false, type: () => Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  requiresSequentialCompletion?: boolean;

  @ApiProperty({ required: false, type: () => Date })
  @IsOptional()
  unpublishedAt?: Date | null;

  @ApiProperty({ required: false, type: () => UserDto })
  @IsOptional()
  unpublishedBy?: UserDto | null;
}
