import { TranslationMap } from '../../utils/i18n/translation-map.type';
import { IsTranslationMap } from '../../utils/i18n/is-translation-map.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

/**
 * A new master data group. `groupKey` is the identifier code reads
 * (`masterDataGroupKey` on a form question, the course level/category
 * lookups), so it is snake_case ASCII and cannot be changed afterwards.
 */
export class CreateMasterDataAdminGroupDto {
  @ApiProperty({ example: 'form_learning_goal' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]{1,63}$/, { message: 'invalidGroupKey' })
  groupKey: string;

  @ApiPropertyOptional({
    example: 'Mục tiêu học tập',
    description:
      'Shorthand for the default locale (vi). Optional when ' +
      '`nameTranslations.vi` is supplied instead.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { vi: 'Mục tiêu học tập', en: 'Learning goal' },
  })
  @IsOptional()
  @IsTranslationMap()
  nameTranslations?: TranslationMap;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsTranslationMap()
  descriptionTranslations?: TranslationMap;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
