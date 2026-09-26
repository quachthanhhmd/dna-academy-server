import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * The public definition shape: exactly what the renderer in the client
 * (`src/components/forms/FormRenderer.tsx`) draws, and nothing else.
 *
 * `optionCodes` is always an array so a single-select and a multi-select are
 * the same shape on the wire; the renderer is what decides cardinality from
 * `type`. `options` is the question's already-narrowed allowlist (spec §2.2
 * C3) — the client never fetches master data for itself.
 */

export class FormOptionDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;
}

export class FormQuestionDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  sectionCode: string;

  @ApiProperty({
    enum: [
      'short_text',
      'long_text',
      'email',
      'phone',
      'url',
      'single_select',
      'multi_select',
      'consent',
    ],
  })
  type: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ required: false, nullable: true })
  placeholder?: string | null;

  @ApiProperty({ required: false, nullable: true })
  helper?: string | null;

  @ApiProperty()
  isRequired: boolean;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty({ required: false, nullable: true })
  minLength?: number | null;

  @ApiProperty({ required: false, nullable: true })
  maxLength?: number | null;

  @ApiProperty()
  allowOther: boolean;

  @ApiProperty({ required: false, nullable: true })
  consentCode?: string | null;

  @ApiProperty({ required: false, nullable: true })
  parentQuestionCode?: string | null;

  @ApiProperty({ required: false, nullable: true })
  parentOptionCode?: string | null;

  @ApiProperty({ type: [FormOptionDto] })
  options: FormOptionDto[];
}

export class FormSectionDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: [FormQuestionDto] })
  questions: FormQuestionDto[];
}

export class FormDefinitionDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false, nullable: true })
  description?: string | null;

  @ApiProperty()
  version: number;

  @ApiProperty({ type: [FormSectionDto] })
  sections: FormSectionDto[];
}

export class FormSubmissionCreatedDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;
}

export class FormPrefillDto {
  @ApiProperty({ required: false, nullable: true })
  fullName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  email?: string | null;

  @ApiProperty({ required: false, nullable: true })
  phone?: string | null;

  @ApiProperty({ required: false, nullable: true })
  selectedCourseId?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'array', items: { type: 'string' } },
    description: 'questionCode to option codes the server already knows',
  })
  answers?: Record<string, string[]>;
}
