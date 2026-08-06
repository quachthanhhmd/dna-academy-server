import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import { MasterDataGroupEntity } from '../../../../../master-data-groups/infrastructure/persistence/relational/entities/master-data-group.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

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
