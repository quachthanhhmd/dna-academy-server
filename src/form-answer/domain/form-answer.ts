import { ApiProperty } from '@nestjs/swagger';
import { FormQuestion } from '../../form-question/domain/form-question';
import { FormSubmission } from '../../form-submission/domain/form-submission';

export class FormAnswer {
  @ApiProperty({ type: () => FormSubmission })
  submission: FormSubmission;
  @ApiProperty({ type: () => FormQuestion })
  question: FormQuestion;
  @ApiProperty({ type: () => String, nullable: true })
  textValue: string | null;
  @ApiProperty({ type: () => String, nullable: true })
  numberValue: string | null;

  @ApiProperty({ type: String })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
