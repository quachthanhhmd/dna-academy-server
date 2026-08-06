import { MasterDataCodeEntity } from '../../../../../master-data-codes/infrastructure/persistence/relational/entities/master-data-code.entity';

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
  name: 'student_career_interest',
})
export class StudentCareerInterestEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: String,
  })
  customInterest?: string | null;

  @ManyToOne(() => MasterDataCodeEntity, { eager: false, nullable: false })
  careerInterest: MasterDataCodeEntity;

  @ManyToOne(() => UserEntity, { eager: true, nullable: false })
  user: UserEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
