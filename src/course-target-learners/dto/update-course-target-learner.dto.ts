// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateCourseTargetLearnerDto } from './create-course-target-learner.dto';

export class UpdateCourseTargetLearnerDto extends PartialType(
  CreateCourseTargetLearnerDto,
) {}
