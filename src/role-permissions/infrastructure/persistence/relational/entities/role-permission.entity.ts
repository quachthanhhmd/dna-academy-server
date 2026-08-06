import { PermissionEntity } from '../../../../../permissions/infrastructure/persistence/relational/entities/permission.entity';

import { RoleEntity } from '../../../../../roles/infrastructure/persistence/relational/entities/role.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'role_permission',
})
export class RolePermissionEntity extends EntityRelationalHelper {
  @ManyToOne(() => PermissionEntity, { eager: true, nullable: false })
  permission: PermissionEntity;

  @ManyToOne(() => RoleEntity, { eager: true, nullable: false })
  role: RoleEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
