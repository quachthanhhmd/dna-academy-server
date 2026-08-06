import { LectureDto } from '../../lectures/dto/lecture.dto';

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

export class CreateQuizSaveDto {
  savedAt?: Date;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  answersJson: string;

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
    type: () => EnrollmentDto,
  })
  @ValidateNested()
  @Type(() => EnrollmentDto)
  @IsNotEmptyObject()
  enrollment: EnrollmentDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
