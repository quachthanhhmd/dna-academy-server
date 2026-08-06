// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateCourseRequirementDto } from './create-course-requirement.dto';

export class UpdateCourseRequirementDto extends PartialType(
  CreateCourseRequirementDto,
) {}
