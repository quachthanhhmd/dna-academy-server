// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateLectureContentDocumentDto } from './create-lecture-content-document.dto';

export class UpdateLectureContentDocumentDto extends PartialType(
  CreateLectureContentDocumentDto,
) {}
