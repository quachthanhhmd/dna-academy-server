import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import {
  Check,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { TranslationMap } from '../../../../../utils/i18n/translation-map.type';

// Epic 6 §2.1.4 — the default locale must always be present; the application
// layer seeds it, this is the last line of defense.
@Check(
  'CK_master_data_group_name_has_default_locale',
  `"name_translations" ? 'vi'`,
)
@Entity({
  name: 'master_data_group',
})
export class MasterDataGroupEntity extends EntityRelationalHelper {
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
    name: 'description',
    nullable: true,
    type: String,
  })
  description?: string | null;

  // Epic 6 — see the identical pair on MasterDataCodeEntity.
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
    name: 'group_key',
    nullable: false,
    type: String,
  })
  groupKey: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
