// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateCareerReflectionQuestionDto } from './create-career-reflection-question.dto';

export class UpdateCareerReflectionQuestionDto extends PartialType(
  CreateCareerReflectionQuestionDto,
) {}
