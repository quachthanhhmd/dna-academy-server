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
  IsOptional,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateLectureContentVideoDto {
  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  youtubeVideoId?: string | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  youtubeUrl: string;

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
