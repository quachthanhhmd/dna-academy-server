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
  IsBoolean,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateLectureContentDocumentDto {
  @ApiProperty({
    required: true,
    type: () => Boolean,
  })
  @IsBoolean()
  isDownloadable: boolean;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  fileName?: string | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  fileUrl: string;

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
