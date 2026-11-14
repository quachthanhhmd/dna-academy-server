import { LectureDto } from '../../lectures/dto/lecture.dto';

import {
  // decorators here

  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
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

export class CreateSurveyQuestionDto {
  @ApiProperty({
    required: true,
    type: () => LectureDto,
  })
  @ValidateNested()
  @Type(() => LectureDto)
  @IsNotEmptyObject()
  lecture: LectureDto;

  archivedAt?: Date | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  ratingLabelMax?: string | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  ratingLabelMin?: string | null;

  @ApiProperty({
    required: false,
    type: () => Number,
  })
  @IsOptional()
  @IsNumber()
  ratingMax?: number | null;

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
  isRequired: boolean;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  questionText: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  questionType: string;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
