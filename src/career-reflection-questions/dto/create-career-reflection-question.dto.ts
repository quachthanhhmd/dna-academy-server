import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CourseDto } from '../../courses/dto/course.dto';
import { IsTranslationMap } from '../../utils/i18n/is-translation-map.validator';
import { TranslationMap } from '../../utils/i18n/translation-map.type';
import {
  CAREER_QUESTION_TYPES,
  OPTION_COUNT_MAX,
  OPTION_COUNT_MIN,
  OPTION_LABEL_MAX,
} from '../career-reflection-question-types';

/** Epic 4.6 §2.2 — one choice on a `selection` question. */
export class CareerReflectionOptionDto {
  @ApiProperty({
    type: Number,
    example: 1,
    description:
      'What lands in ratingAnswer. Stable identity: never renumber a key that ' +
      'has answers — reorder the array instead.',
  })
  @IsInt()
  @Min(1)
  key: number;

  @ApiProperty({ type: String, description: 'Default locale (vi).' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(OPTION_LABEL_MAX)
  label: string;

  @ApiPropertyOptional({ type: Object, example: { en: 'Definitely' } })
  @IsOptional()
  @IsTranslationMap()
  labelTranslations?: TranslationMap | null;
}

export class CreateCareerReflectionQuestionDto {
  @ApiProperty({ enum: CAREER_QUESTION_TYPES, example: 'selection' })
  @IsIn(CAREER_QUESTION_TYPES)
  questionType: string;

  @ApiProperty({ type: String, description: 'Default locale (vi).' })
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @ApiPropertyOptional({
    type: Object,
    example: { en: 'What is your next intention?' },
  })
  @IsOptional()
  @IsTranslationMap()
  questionTextTranslations?: TranslationMap | null;

  @ApiPropertyOptional({
    type: () => [CareerReflectionOptionDto],
    description:
      '`selection` only, 2–7 choices. Array order is display order. Must be ' +
      'omitted or null for `free_text`.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(OPTION_COUNT_MIN)
  @ArrayMaxSize(OPTION_COUNT_MAX)
  @ValidateNested({ each: true })
  @Type(() => CareerReflectionOptionDto)
  options?: CareerReflectionOptionDto[] | null;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ type: Number, example: 1 })
  @IsNumber()
  displayOrder: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Epic 4.6 D6: retained for existing rows, no longer used by the form ' +
      'or the dashboard.',
  })
  @IsOptional()
  @IsString()
  category?: string | null;

  @ApiPropertyOptional({
    type: () => CourseDto,
    nullable: true,
    description: 'Omit or null for a global question shown on every course.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CourseDto)
  @IsNotEmptyObject()
  course?: CourseDto | null;
}
