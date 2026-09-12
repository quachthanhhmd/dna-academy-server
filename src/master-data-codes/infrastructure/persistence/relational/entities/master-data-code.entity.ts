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
  JoinColumn,
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
  `"name_translations" ? 'vi'`,
)
@Entity({
  name: 'master_data_code',
})
export class MasterDataCodeEntity extends EntityRelationalHelper {
  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: UserEntity | null;

  @Column({
    name: 'display_order',
    nullable: false,
    type: Number,
  })
  displayOrder: number;

  @Column({
    name: 'is_active',
    nullable: false,
    type: Boolean,
  })
  isActive: boolean;

  @Column({
    name: 'thumbnail_url',
    nullable: true,
    type: String,
  })
  thumbnailUrl?: string | null;

  @Column({
    name: 'description',
    nullable: true,
    type: String,
  })
  description?: string | null;

  // Epic 6: `name`/`description` hold the default locale (vi); every other
  // locale lives here as { "<locale>": "<value>" }. The DB CHECK constraint
  // added by the migration guarantees the `vi` key is always present.
  @Column({
    name: 'name_translations',
    nullable: false,
    type: 'jsonb',
    default: {},
  })
  nameTranslations: TranslationMap;

  @Column({
    name: 'description_translations',
    nullable: false,
    type: 'jsonb',
    default: {},
  })
  descriptionTranslations: TranslationMap;

  @Column({
    name: 'name',
    nullable: false,
    type: String,
  })
  name: string;

  @Column({
    name: 'code',
    nullable: false,
    type: String,
  })
  code: string;

  @ManyToOne(() => MasterDataGroupEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'group_id' })
  group: MasterDataGroupEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
