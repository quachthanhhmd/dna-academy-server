// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateLectureProgressDto } from './create-lecture-progress.dto';

export class UpdateLectureProgressDto extends PartialType(
  CreateLectureProgressDto,
) {}
