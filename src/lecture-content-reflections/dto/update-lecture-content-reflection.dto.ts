// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateLectureContentReflectionDto } from './create-lecture-content-reflection.dto';

export class UpdateLectureContentReflectionDto extends PartialType(
  CreateLectureContentReflectionDto,
) {}
