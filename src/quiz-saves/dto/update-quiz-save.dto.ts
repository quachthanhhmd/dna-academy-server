// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateQuizSaveDto } from './create-quiz-save.dto';

export class UpdateQuizSaveDto extends PartialType(CreateQuizSaveDto) {}
