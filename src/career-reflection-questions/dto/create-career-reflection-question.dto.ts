import { CourseDto } from '../../courses/dto/course.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateCareerReflectionQuestionDto {
  @ApiProperty({
    required: true,
    type: () => Boolean,
  })
  @IsBoolean()
  isActive: boolean;

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
  questionText: string;

  @ApiProperty({
    required: false,
    type: () => CourseDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CourseDto)
  @IsNotEmptyObject()
  course?: CourseDto | null;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
