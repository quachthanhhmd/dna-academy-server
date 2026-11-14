import { SurveyQuestionDto } from '../../survey-questions/dto/survey-question.dto';

import {
  // decorators here

  IsString,
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

export class CreateSurveyQuestionOptionDto {
  @ApiProperty({
    required: true,
    type: () => SurveyQuestionDto,
  })
  @ValidateNested()
  @Type(() => SurveyQuestionDto)
  @IsNotEmptyObject()
  question: SurveyQuestionDto;

  archivedAt?: Date | null;

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
  optionText: string;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
