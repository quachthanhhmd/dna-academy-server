// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateStudentCareerInterestDto } from './create-student-career-interest.dto';

export class UpdateStudentCareerInterestDto extends PartialType(
  CreateStudentCareerInterestDto,
) {}
