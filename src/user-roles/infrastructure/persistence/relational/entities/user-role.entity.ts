import { RoleEntity } from '../../../../../roles/infrastructure/persistence/relational/entities/role.entity';

import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

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
  name: 'user_role',
})
export class UserRoleEntity extends EntityRelationalHelper {
  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  assignedBy?: UserEntity | null;

  @Column({
    nullable: false,
    type: Date,
  })
  assignedAt?: Date;

  @ManyToOne(() => RoleEntity, { eager: true, nullable: false })
  role: RoleEntity;

  @ManyToOne(() => UserEntity, { eager: true, nullable: false })
  user: UserEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
