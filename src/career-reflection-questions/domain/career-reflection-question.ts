import { Course } from '../../courses/domain/course';

import { ApiProperty } from '@nestjs/swagger';
import { TranslationMap } from '../../utils/i18n/translation-map.type';
import { CareerReflectionOption } from '../career-reflection-question-types';

export class CareerReflectionQuestion {
  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  isActive: boolean;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  displayOrder: number;

  @ApiProperty({
    type: () => String,
    enum: ['free_text', 'selection'],
    example: 'selection',
  })
  questionType: string;

  @ApiProperty({ type: () => Boolean, example: true })
  isRequired: boolean;

  @ApiProperty({
    type: () => [Object],
    nullable: true,
    description:
      'selection only: [{ key, label, labelTranslations }]. Array order is display order; key is identity.',
  })
  options?: CareerReflectionOption[] | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  questionText: string;

  @ApiProperty({ type: () => Object, nullable: true, example: { en: '…' } })
  questionTextTranslations?: TranslationMap | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
    example: 'interest',
  })
  category?: string | null;

  @ApiProperty({
    type: () => Course,
    nullable: true,
  })
  course?: Course | null;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
