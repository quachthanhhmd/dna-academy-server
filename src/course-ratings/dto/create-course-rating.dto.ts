import { CourseDto } from '../../courses/dto/course.dto';

import { UserDto } from '../../users/dto/user.dto';

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
  IsString,
  IsOptional,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateCourseRatingDto {
  submittedAt?: Date;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  reviewStatus: string;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  reviewText?: string | null;

  @ApiProperty({
    required: true,
    type: () => Number,
  })
  @IsNumber()
  rating: number;

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
