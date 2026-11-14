import { SurveyQuestionOptionDto } from '../../survey-question-options/dto/survey-question-option.dto';

import { SurveyQuestionDto } from '../../survey-questions/dto/survey-question.dto';

import { SurveyResponseDto } from '../../survey-responses/dto/survey-response.dto';

import {
  // decorators here

  IsString,
  IsOptional,
  IsNumber,
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

export class CreateSurveyAnswerDto {
  @ApiProperty({
    required: false,
    type: () => SurveyQuestionOptionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SurveyQuestionOptionDto)
  @IsNotEmptyObject()
  option?: SurveyQuestionOptionDto | null;

  @ApiProperty({
    required: true,
    type: () => SurveyQuestionDto,
  })
  @ValidateNested()
  @Type(() => SurveyQuestionDto)
  @IsNotEmptyObject()
  question: SurveyQuestionDto;

  @ApiProperty({
    required: true,
    type: () => SurveyResponseDto,
  })
  @ValidateNested()
  @Type(() => SurveyResponseDto)
  @IsNotEmptyObject()
  response: SurveyResponseDto;

  @ApiProperty({
    required: false,
    type: () => Number,
  })
  @IsOptional()
  @IsNumber()
  ratingValue?: number | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  textAnswer?: string | null;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
