import { LectureDto } from '../../lectures/dto/lecture.dto';

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

export class CreateReflectionQuestionDto {
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
    required: true,
    type: () => LectureDto,
  })
  @ValidateNested()
  @Type(() => LectureDto)
  @IsNotEmptyObject()
  lecture: LectureDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
