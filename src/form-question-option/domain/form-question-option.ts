import { ApiProperty } from '@nestjs/swagger';
import { FormQuestion } from '../../form-question/domain/form-question';

export class FormQuestionOption {
  @ApiProperty({ type: () => FormQuestion })
  question: FormQuestion;
  @ApiProperty({ type: () => String, nullable: false })
  optionCode: string;
  @ApiProperty({ type: () => Number, nullable: false })
  displayOrder: number;

  @ApiProperty({ type: String })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
