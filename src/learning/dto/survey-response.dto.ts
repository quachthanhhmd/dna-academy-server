import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SurveyAnswerInputDto {
  @ApiProperty({ type: String })
  @IsUUID()
  questionId: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'single_choice: exactly one; multiple_choice: one or more.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  optionIds?: string[];

  @ApiPropertyOptional({
    type: Number,
    description: 'rating_scale: 1 to its max.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  ratingValue?: number;

  @ApiPropertyOptional({
    type: String,
    description: 'short_text (≤500) or long_text (≤5000).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  textAnswer?: string;
}

export class SubmitSurveyResponseDto {
  @ApiProperty({
    type: [SurveyAnswerInputDto],
    description:
      'One entry per answered question. Optional questions may be left out; ' +
      'every required one must be present.',
  })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SurveyAnswerInputDto)
  answers: SurveyAnswerInputDto[];
}
