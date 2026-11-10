// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateLectureContentRatingDto } from './create-lecture-content-rating.dto';

export class UpdateLectureContentRatingDto extends PartialType(
  CreateLectureContentRatingDto,
) {}
