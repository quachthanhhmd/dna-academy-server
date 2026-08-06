// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateLectureContentVideoDto } from './create-lecture-content-video.dto';

export class UpdateLectureContentVideoDto extends PartialType(
  CreateLectureContentVideoDto,
) {}
