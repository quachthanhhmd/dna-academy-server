import { ModuleEntity } from '../../../../../modules/infrastructure/persistence/relational/entities/module.entity';

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
  name: 'permission',
})
export class PermissionEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: String,
  })
  label?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  action: string;

  @ManyToOne(() => ModuleEntity, { eager: true, nullable: false })
  module: ModuleEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
