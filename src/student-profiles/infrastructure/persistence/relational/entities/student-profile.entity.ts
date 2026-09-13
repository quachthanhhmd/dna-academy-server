import { MasterDataCodeEntity } from '../../../../../master-data-codes/infrastructure/persistence/relational/entities/master-data-code.entity';

import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
  ManyToOne,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'student_profile',
})
export class StudentProfileEntity extends EntityRelationalHelper {
  @ManyToOne(() => MasterDataCodeEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'education_stage_code_id' })
  educationStageCode?: MasterDataCodeEntity | null;

  @OneToOne(() => UserEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
