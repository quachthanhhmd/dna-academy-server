import { ApiProperty } from '@nestjs/swagger';
import { FormAnswer } from '../../form-answer/domain/form-answer';
import { FormQuestion } from '../../form-question/domain/form-question';
import { FormSubmission } from '../../form-submission/domain/form-submission';

export class FormAnswerOption {
  @ApiProperty({ type: () => FormAnswer })
  answer: FormAnswer;
  @ApiProperty({ type: () => FormQuestion })
  question: FormQuestion;
  @ApiProperty({ type: () => FormSubmission })
  submission: FormSubmission;
  @ApiProperty({ type: () => String, nullable: false })
  optionCode: string;
  @ApiProperty({ type: () => String, nullable: true })
  optionGroupKey: string | null;

  @ApiProperty({ type: String })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
