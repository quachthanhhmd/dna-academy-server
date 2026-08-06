// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateCourseRatingDto } from './create-course-rating.dto';

export class UpdateCourseRatingDto extends PartialType(CreateCourseRatingDto) {}
