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
    enum: ['slider', 'radio', 'select'],
    example: 'slider',
  })
  questionType: string;

  @ApiProperty({ type: () => String, nullable: true })
  labelMin?: string | null;

  @ApiProperty({ type: () => String, nullable: true })
  labelMax?: string | null;

  @ApiProperty({ type: () => Object, nullable: true })
  labelMinTranslations?: TranslationMap | null;

  @ApiProperty({ type: () => Object, nullable: true })
  labelMaxTranslations?: TranslationMap | null;

  @ApiProperty({
    type: () => [Object],
    nullable: true,
    description: 'radio/select choices, ascending least to most positive.',
  })
  options?: CareerReflectionOption[] | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  questionText: string;

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
