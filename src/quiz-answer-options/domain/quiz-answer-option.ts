import { QuizQuestion } from '../../quiz-questions/domain/quiz-question';

import { ApiProperty } from '@nestjs/swagger';

export class QuizAnswerOption {
  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  displayOrder: number;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  isCorrect: boolean;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  optionText: string;

  @ApiProperty({
    type: () => QuizQuestion,
    nullable: false,
  })
  question: QuizQuestion;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
