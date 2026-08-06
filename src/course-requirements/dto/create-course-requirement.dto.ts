import { CourseDto } from '../../courses/dto/course.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsString,
  IsNumber,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateCourseRequirementDto {
  @ApiProperty({
    required: true,
    type: () => Number,
  })
  @IsNumber()
  displayOrder: number;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  description: string;

  @ApiProperty({
    required: true,
    type: () => CourseDto,
  })
  @ValidateNested()
  @Type(() => CourseDto)
  @IsNotEmptyObject()
  course: CourseDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
