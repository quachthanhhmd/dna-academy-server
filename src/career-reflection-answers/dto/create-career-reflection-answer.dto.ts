import { CareerReflectionQuestionDto } from '../../career-reflection-questions/dto/career-reflection-question.dto';

import { EnrollmentDto } from '../../enrollments/dto/enrollment.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateCareerReflectionAnswerDto {
  submittedAt?: Date;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  textAnswer?: string | null;

  @ApiProperty({
    required: false,
    type: () => Number,
  })
  @IsOptional()
  @IsNumber()
  ratingAnswer?: number | null;

  @ApiProperty({
    required: true,
    type: () => CareerReflectionQuestionDto,
  })
  @ValidateNested()
  @Type(() => CareerReflectionQuestionDto)
  @IsNotEmptyObject()
  question: CareerReflectionQuestionDto;

  @ApiProperty({
    required: true,
    type: () => EnrollmentDto,
  })
  @ValidateNested()
  @Type(() => EnrollmentDto)
  @IsNotEmptyObject()
  enrollment: EnrollmentDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
