import { ApiProperty } from '@nestjs/swagger';
import { FormDefinition } from '../../form-definition/domain/form-definition';

export class FormQuestion {
  @ApiProperty({ type: () => FormDefinition })
  formDefinition: FormDefinition;
  @ApiProperty({ type: () => String, nullable: false })
  code: string;
  @ApiProperty({ type: () => String, nullable: false })
  sectionCode: string;
  @ApiProperty({ type: () => String, nullable: false })
  questionType: string;
  @ApiProperty({ type: () => String, nullable: true })
  masterDataGroupKey: string | null;
  @ApiProperty({ type: () => Boolean, nullable: false })
  isRequired: boolean;
  @ApiProperty({ type: () => Number, nullable: false })
  displayOrder: number;
  @ApiProperty({ type: () => String, nullable: false })
  labelTranslations: Record<string, string>;
  @ApiProperty({ type: () => String, nullable: true })
  placeholderTranslations: Record<string, string> | null;
  @ApiProperty({ type: () => String, nullable: true })
  helperTranslations: Record<string, string> | null;
  @ApiProperty({ type: () => Number, nullable: true })
  minLength: number | null;
  @ApiProperty({ type: () => Number, nullable: true })
  maxLength: number | null;
  @ApiProperty({ type: () => Boolean, nullable: false })
  allowOther: boolean;
  @ApiProperty({ type: () => String, nullable: true })
  consentCode: string | null;
  @ApiProperty({ type: () => FormQuestion })
  parentQuestion: FormQuestion;
  @ApiProperty({ type: () => String, nullable: true })
  parentOptionCode: string | null;

  @ApiProperty({ type: String })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
