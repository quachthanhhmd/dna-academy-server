// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateQuizAttemptDto } from './create-quiz-attempt.dto';

export class UpdateQuizAttemptDto extends PartialType(CreateQuizAttemptDto) {}
