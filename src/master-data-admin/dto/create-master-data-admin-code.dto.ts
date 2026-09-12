import { TranslationMap } from '../../utils/i18n/translation-map.type';
import { IsTranslationMap } from '../../utils/i18n/is-translation-map.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMasterDataAdminCodeDto {
  @ApiProperty({ example: 'beginner' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiPropertyOptional({
    example: 'Cơ bản',
    description:
      'Shorthand for the default locale (vi). Optional when ' +
      '`nameTranslations.vi` is supplied instead.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { vi: 'Cơ bản', en: 'Beginner' },
    description:
      'Per-locale names. `nameTranslations.vi` is required — either directly ' +
      'or via the `name` shorthand. Sending a blank value for a locale ' +
      'removes that translation.',
  })
  @IsOptional()
  @IsTranslationMap()
  nameTranslations?: TranslationMap;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      vi: 'Dành cho người mới bắt đầu.',
      en: 'For first-time learners.',
    },
  })
  @IsOptional()
  @IsTranslationMap()
  descriptionTranslations?: TranslationMap;
}
