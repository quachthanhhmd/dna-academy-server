import { EnrollmentDto } from '../../enrollments/dto/enrollment.dto';

import { LectureDto } from '../../lectures/dto/lecture.dto';

import {
  // decorators here

  Transform,
  Type,
} from 'class-transformer';

import {
  // decorators here

  IsDate,
  ValidateNested,
  IsNotEmptyObject,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateSurveyResponseDto {
  @ApiProperty({
    required: true,
    type: () => EnrollmentDto,
  })
  @ValidateNested()
  @Type(() => EnrollmentDto)
  @IsNotEmptyObject()
  enrollment: EnrollmentDto;

  @ApiProperty({
    required: true,
    type: () => LectureDto,
  })
  @ValidateNested()
  @Type(() => LectureDto)
  @IsNotEmptyObject()
  lecture: LectureDto;

  @ApiProperty({
    required: true,
    type: () => Date,
  })
  @Transform(({ value }) => new Date(value))
  @IsDate()
  submittedAt: Date;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
