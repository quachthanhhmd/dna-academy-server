import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import { MasterDataGroupEntity } from '../../../../../master-data-groups/infrastructure/persistence/relational/entities/master-data-group.entity';

import {
  Check,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { TranslationMap } from '../../../../../utils/i18n/translation-map.type';

@Index('IDX_master_data_code_group_active_order', [
  'displayOrder',
  'group',
  'isActive',
])
// Epic 6 §2.1.4 — the default locale must always be present; the application
// layer seeds it, this is the last line of defense.
@Check(
  'CK_master_data_code_name_has_default_locale',
  `"nameTranslations" ? 'vi'`,
)
@Entity({
  name: 'master_data_code',
})
export class MasterDataCodeEntity extends EntityRelationalHelper {
  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  createdBy?: UserEntity | null;

  @Column({
    nullable: false,
    type: Number,
  })
  displayOrder: number;

  @Column({
    nullable: false,
    type: Boolean,
  })
  isActive: boolean;

  @Column({
    nullable: true,
    type: String,
  })
  thumbnailUrl?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  description?: string | null;

  // Epic 6: `name`/`description` hold the default locale (vi); every other
  // locale lives here as { "<locale>": "<value>" }. The DB CHECK constraint
  // added by the migration guarantees the `vi` key is always present.
  @Column({
    nullable: false,
    type: 'jsonb',
    default: {},
  })
  nameTranslations: TranslationMap;

  @Column({
    nullable: false,
    type: 'jsonb',
    default: {},
  })
  descriptionTranslations: TranslationMap;

  @Column({
    nullable: false,
    type: String,
  })
  name: string;

  @Column({
    nullable: false,
    type: String,
  })
  code: string;

  @ManyToOne(() => MasterDataGroupEntity, { eager: true, nullable: false })
  group: MasterDataGroupEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
