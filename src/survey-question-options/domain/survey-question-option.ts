import { SurveyQuestion } from '../../survey-questions/domain/survey-question';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SurveyQuestionOption {
  @ApiProperty({
    type: () => SurveyQuestion,
    nullable: false,
  })
  question: SurveyQuestion;

  @Exclude({ toPlainOnly: true })
  archivedAt?: Date | null;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  displayOrder: number;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  optionText: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
