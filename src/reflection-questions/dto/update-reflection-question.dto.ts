// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateReflectionQuestionDto } from './create-reflection-question.dto';

export class UpdateReflectionQuestionDto extends PartialType(
  CreateReflectionQuestionDto,
) {}
