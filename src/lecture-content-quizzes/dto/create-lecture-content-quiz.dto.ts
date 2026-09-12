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
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateLectureContentQuizDto {
  @ApiProperty({
    required: true,
    type: () => Boolean,
  })
  @IsBoolean()
  allowResume: boolean;

  @ApiProperty({
    required: true,
    type: () => Number,
  })
  @IsNumber()
  passingScore: number;

  @ApiProperty({
    required: false,
    type: () => Number,
    description:
      'Epic 4 v2.1 — pass mark 0-100. Omitted falls back to the ' +
      'QUIZ_PASS_THRESHOLD_DEFAULT env value.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passThresholdPercent?: number;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  instructions?: string | null;

  @ApiProperty({
    required: false,
    type: () => Number,
    description:
      'Epic 4 v2 — countdown in seconds. Null means no limit, which hides ' +
      'the timer in the player.',
  })
  @IsOptional()
  @IsNumber()
  timeLimitSecs?: number | null;

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
