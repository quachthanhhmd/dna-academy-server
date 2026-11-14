import { LectureDto } from '../../lectures/dto/lecture.dto';

import {
  // decorators here

  IsString,
  IsOptional,
  IsBoolean,
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

export class CreateLectureContentRatingDto {
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
    type: () => Boolean,
  })
  @IsBoolean()
  allowComment: boolean;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  labelMax?: string | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  labelMin?: string | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  prompt: string;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
