import { User } from '../../users/domain/user';
import { Exclude } from 'class-transformer';
import { MediaFile } from '../../media-files/domain/media-file';

import { QuizAnswerOption } from '../../quiz-answer-options/domain/quiz-answer-option';

import { QuizQuestion } from '../../quiz-questions/domain/quiz-question';

import { QuizAttempt } from '../../quiz-attempts/domain/quiz-attempt';

import { ApiProperty } from '@nestjs/swagger';

export class QuizAttemptAnswer {
  @Exclude({ toPlainOnly: true })
  gradedAt?: Date | null;

  @Exclude({ toPlainOnly: true })
  gradedBy?: User | null;

  @Exclude({ toPlainOnly: true })
  score?: number | null;

  @Exclude({ toPlainOnly: true })
  isCorrect?: boolean | null;

  @ApiProperty({
    type: () => MediaFile,
    nullable: true,
  })
  file?: MediaFile | null;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  ratingAnswer?: number | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  textAnswer?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  selectedOptionIds?: string | null;

  @ApiProperty({
    type: () => QuizAnswerOption,
    nullable: true,
  })
  selectedOption?: QuizAnswerOption | null;

  @ApiProperty({
    type: () => QuizQuestion,
    nullable: false,
  })
  question: QuizQuestion;

  @ApiProperty({
    type: () => QuizAttempt,
    nullable: false,
  })
  attempt: QuizAttempt;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
