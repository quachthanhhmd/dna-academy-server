import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import {
  Check,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { TranslationMap } from '../../../../../utils/i18n/translation-map.type';

// Epic 6 §2.1.4 — the default locale must always be present; the application
// layer seeds it, this is the last line of defense.
@Check(
  'CK_master_data_group_name_has_default_locale',
  `"nameTranslations" ? 'vi'`,
)
@Entity({
  name: 'master_data_group',
})
export class MasterDataGroupEntity extends EntityRelationalHelper {
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
  description?: string | null;

  // Epic 6 — see the identical pair on MasterDataCodeEntity.
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
  groupKey: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
