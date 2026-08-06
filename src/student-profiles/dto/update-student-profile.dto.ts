// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateStudentProfileDto } from './create-student-profile.dto';

export class UpdateStudentProfileDto extends PartialType(
  CreateStudentProfileDto,
) {}
