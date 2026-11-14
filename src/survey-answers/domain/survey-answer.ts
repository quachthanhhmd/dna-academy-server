import { SurveyQuestionOption } from '../../survey-question-options/domain/survey-question-option';

import { SurveyQuestion } from '../../survey-questions/domain/survey-question';

import { SurveyResponse } from '../../survey-responses/domain/survey-response';

import { ApiProperty } from '@nestjs/swagger';

export class SurveyAnswer {
  @ApiProperty({
    type: () => SurveyQuestionOption,
    nullable: true,
  })
  option?: SurveyQuestionOption | null;

  @ApiProperty({
    type: () => SurveyQuestion,
    nullable: false,
  })
  question: SurveyQuestion;

  @ApiProperty({
    type: () => SurveyResponse,
    nullable: false,
  })
  response: SurveyResponse;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  ratingValue?: number | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  textAnswer?: string | null;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
