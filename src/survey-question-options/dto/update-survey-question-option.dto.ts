// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateSurveyQuestionOptionDto } from './create-survey-question-option.dto';

export class UpdateSurveyQuestionOptionDto extends PartialType(
  CreateSurveyQuestionOptionDto,
) {}
