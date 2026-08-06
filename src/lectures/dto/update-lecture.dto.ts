// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateLectureDto } from './create-lecture.dto';

export class UpdateLectureDto extends PartialType(CreateLectureDto) {}
