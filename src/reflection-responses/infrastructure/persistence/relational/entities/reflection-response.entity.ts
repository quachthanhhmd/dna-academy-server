import { ReflectionQuestionEntity } from '../../../../../reflection-questions/infrastructure/persistence/relational/entities/reflection-question.entity';

import { EnrollmentEntity } from '../../../../../enrollments/infrastructure/persistence/relational/entities/enrollment.entity';

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
  name: 'reflection_response',
})
export class ReflectionResponseEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: Date,
  })
  submittedAt?: Date;

  @Column({
    nullable: false,
    type: String,
  })
  responseText: string;

  @ManyToOne(() => ReflectionQuestionEntity, { eager: true, nullable: false })
  question: ReflectionQuestionEntity;

  @ManyToOne(() => EnrollmentEntity, { eager: true, nullable: false })
  enrollment: EnrollmentEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
