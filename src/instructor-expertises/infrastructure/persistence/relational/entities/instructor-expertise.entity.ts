import { MasterDataCodeEntity } from '../../../../../master-data-codes/infrastructure/persistence/relational/entities/master-data-code.entity';

import { InstructorEntity } from '../../../../../instructors/infrastructure/persistence/relational/entities/instructor.entity';

import {
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Index(
  'IDX_instructor_expertise_pair_unique',
  ['instructor', 'expertiseCode'],
  {
    unique: true,
  },
)
@Entity({
  name: 'instructor_expertise',
})
export class InstructorExpertiseEntity extends EntityRelationalHelper {
  @ManyToOne(() => InstructorEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'instructor_id' })
  instructor: InstructorEntity;

  @ManyToOne(() => MasterDataCodeEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'expertise_code_id' })
  expertiseCode: MasterDataCodeEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
