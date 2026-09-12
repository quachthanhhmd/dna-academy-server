import { CourseDto } from '../../courses/dto/course.dto';
import {
  CAREER_QUESTION_TYPES,
  OPTION_COUNT_MAX,
  OPTION_COUNT_MIN,
} from '../career-reflection-question-types';
import { TranslationMap } from '../../utils/i18n/translation-map.type';
import { IsTranslationMap } from '../../utils/i18n/is-translation-map.validator';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsIn,
  IsArray,
  IsInt,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

/** Epic 4.1 §3.1 — one choice on a radio/select question. */
export class CareerReflectionOptionDto {
  @ApiProperty({
    required: true,
    type: () => Number,
    description:
      "What lands in ratingAnswer. The option's own value, never its index.",
  })
  @IsInt()
  value: number;

  @ApiProperty({ required: true, type: () => String })
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiProperty({ required: false, type: () => Object })
  @IsOptional()
  @IsTranslationMap()
  labelTranslations?: TranslationMap | null;
}

export class CreateCareerReflectionQuestionDto {
  @ApiProperty({
    required: true,
    type: () => Boolean,
  })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    required: true,
    type: () => Number,
  })
  @IsNumber()
  displayOrder: number;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  questionText: string;

  @ApiProperty({
    required: false,
    enum: CAREER_QUESTION_TYPES,
    default: 'slider',
    description: 'How the post-completion form renders this question.',
  })
  @IsOptional()
  @IsIn(CAREER_QUESTION_TYPES)
  questionType?: string;

  @ApiProperty({
    required: false,
    type: () => String,
    description: 'Slider only. Default locale (vi); see labelMinTranslations.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  labelMin?: string | null;

  @ApiProperty({ required: false, type: () => String })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  labelMax?: string | null;

  @ApiProperty({ required: false, type: () => Object })
  @IsOptional()
  @IsTranslationMap()
  labelMinTranslations?: TranslationMap | null;

  @ApiProperty({ required: false, type: () => Object })
  @IsOptional()
  @IsTranslationMap()
  labelMaxTranslations?: TranslationMap | null;

  @ApiProperty({
    required: false,
    type: () => [CareerReflectionOptionDto],
    description:
      'radio/select only, ordered ascending from least to most positive.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(OPTION_COUNT_MIN)
  @ArrayMaxSize(OPTION_COUNT_MAX)
  @ValidateNested({ each: true })
  @Type(() => CareerReflectionOptionDto)
  options?: CareerReflectionOptionDto[] | null;

  @ApiProperty({
    required: false,
    type: () => String,
    description:
      'Groups the question on the post-completion form, e.g. interest, ' +
      'understanding, confidence, skill_fit, advanced_intention, ' +
      'overall_usefulness. Null lands in the "uncategorized" bucket.',
  })
  @IsOptional()
  @IsString()
  category?: string | null;

  @ApiProperty({
    required: false,
    type: () => CourseDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CourseDto)
  @IsNotEmptyObject()
  course?: CourseDto | null;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
