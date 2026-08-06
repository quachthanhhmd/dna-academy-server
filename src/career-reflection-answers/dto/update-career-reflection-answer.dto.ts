// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateCareerReflectionAnswerDto } from './create-career-reflection-answer.dto';

export class UpdateCareerReflectionAnswerDto extends PartialType(
  CreateCareerReflectionAnswerDto,
) {}
