// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateCourseLearningOutcomeDto } from './create-course-learning-outcome.dto';

export class UpdateCourseLearningOutcomeDto extends PartialType(
  CreateCourseLearningOutcomeDto,
) {}
