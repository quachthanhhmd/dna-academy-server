import { ReflectionQuestionDto } from '../../reflection-questions/dto/reflection-question.dto';

import { EnrollmentDto } from '../../enrollments/dto/enrollment.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsString,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateReflectionResponseDto {
  submittedAt?: Date;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  responseText: string;

  @ApiProperty({
    required: true,
    type: () => ReflectionQuestionDto,
  })
  @ValidateNested()
  @Type(() => ReflectionQuestionDto)
  @IsNotEmptyObject()
  question: ReflectionQuestionDto;

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
