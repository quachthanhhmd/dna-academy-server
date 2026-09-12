import { User } from '../../users/domain/user';
import { Exclude } from 'class-transformer';
import { MasterDataGroup } from '../../master-data-groups/domain/master-data-group';

import { ApiProperty } from '@nestjs/swagger';
import { TranslationMap } from '../../utils/i18n/translation-map.type';

export class MasterDataCode {
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
  thumbnailUrl?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  description?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
    description:
      'Resolved for the request locale (Epic 6). Falls back to Vietnamese, ' +
      'then to the stored default-locale value.',
  })
  name: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { vi: 'Cơ bản', en: 'Beginner' },
    description: 'All stored translations of `name`, keyed by locale.',
  })
  nameTranslations: TranslationMap;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'All stored translations of `description`, keyed by locale.',
  })
  descriptionTranslations: TranslationMap;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  code: string;

  @ApiProperty({
    type: () => MasterDataGroup,
    nullable: false,
  })
  group: MasterDataGroup;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
