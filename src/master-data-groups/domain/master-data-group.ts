import { User } from '../../users/domain/user';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TranslationMap } from '../../utils/i18n/translation-map.type';

export class MasterDataGroup {
  @Exclude({ toPlainOnly: true })
  createdBy?: User | null;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  displayOrder: number;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  isActive: boolean;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  description?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
    description: 'Resolved for the request locale (Epic 6).',
  })
  name: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { vi: 'Cấp độ khóa học', en: 'Course Level' },
  })
  nameTranslations: TranslationMap;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  descriptionTranslations: TranslationMap;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  groupKey: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
