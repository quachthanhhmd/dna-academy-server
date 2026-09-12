import { RoleEntity } from '../../../../../roles/infrastructure/persistence/relational/entities/role.entity';

import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  JoinColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'user_role',
})
export class UserRoleEntity extends EntityRelationalHelper {
  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'assigned_by_id' })
  assignedBy?: UserEntity | null;

  @Column({
    name: 'assigned_at',
    nullable: false,
    type: Date,
  })
  assignedAt?: Date;

  @ManyToOne(() => RoleEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @ManyToOne(() => UserEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
