import { SectionDto } from '../../sections/dto/section.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateLectureDto {
  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  status: string;

  @ApiProperty({
    required: true,
    type: () => Number,
  })
  @IsNumber()
  displayOrder: number;

  @ApiProperty({
    required: true,
    type: () => Boolean,
  })
  @IsBoolean()
  requiresCompletion: boolean;

  @ApiProperty({
    required: true,
    type: () => Boolean,
  })
  @IsBoolean()
  isPreview: boolean;

  @ApiProperty({
    required: true,
    type: () => Number,
  })
  @IsNumber()
  durationSecs: number;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  lectureType: string;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  title: string;

  @ApiProperty({
    required: true,
    type: () => SectionDto,
  })
  @ValidateNested()
  @Type(() => SectionDto)
  @IsNotEmptyObject()
  section: SectionDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
