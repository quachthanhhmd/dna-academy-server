// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateQuizAnswerOptionDto } from './create-quiz-answer-option.dto';

export class UpdateQuizAnswerOptionDto extends PartialType(
  CreateQuizAnswerOptionDto,
) {}
