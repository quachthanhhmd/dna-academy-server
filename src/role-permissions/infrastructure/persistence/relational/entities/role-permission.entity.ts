import { PermissionEntity } from '../../../../../permissions/infrastructure/persistence/relational/entities/permission.entity';

import { RoleEntity } from '../../../../../roles/infrastructure/persistence/relational/entities/role.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'role_permission',
})
export class RolePermissionEntity extends EntityRelationalHelper {
  @ManyToOne(() => PermissionEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'permission_id' })
  permission: PermissionEntity;

  @ManyToOne(() => RoleEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
