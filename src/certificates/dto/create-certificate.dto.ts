import { MediaFileDto } from '../../media-files/dto/media-file.dto';

import { CourseDto } from '../../courses/dto/course.dto';

import { UserDto } from '../../users/dto/user.dto';

import { EnrollmentDto } from '../../enrollments/dto/enrollment.dto';

import {
  // decorators here
  Type,
  Transform,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsString,
  IsDate,
  IsOptional,
  Max,
  Min,
  IsInt,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateCertificateDto {
  issuedAt?: Date;

  @ApiProperty({
    required: false,
    type: () => MediaFileDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaFileDto)
  @IsNotEmptyObject()
  file?: MediaFileDto | null;

  @ApiProperty({
    required: true,
    type: () => Date,
  })
  @Transform(({ value }) => new Date(value))
  @IsDate()
  completionDate: Date;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  courseTitleSnapshot: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  studentNameSnapshot: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  certificateNumber: string;

  @ApiProperty({
    required: false,
    type: () => Number,
    description:
      'Epic 4.5 — frozen at issue time. Null when the student submitted no ' +
      'quiz for this course.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  finalGradePct?: number | null;

  @ApiProperty({
    required: true,
    type: () => CourseDto,
  })
  @ValidateNested()
  @Type(() => CourseDto)
  @IsNotEmptyObject()
  course: CourseDto;

  @ApiProperty({
    required: true,
    type: () => UserDto,
  })
  @ValidateNested()
  @Type(() => UserDto)
  @IsNotEmptyObject()
  student: UserDto;

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
