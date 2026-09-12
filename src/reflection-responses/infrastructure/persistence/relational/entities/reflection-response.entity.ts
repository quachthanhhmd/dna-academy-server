import { ReflectionQuestionEntity } from '../../../../../reflection-questions/infrastructure/persistence/relational/entities/reflection-question.entity';

import { EnrollmentEntity } from '../../../../../enrollments/infrastructure/persistence/relational/entities/enrollment.entity';

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
  name: 'reflection_response',
})
export class ReflectionResponseEntity extends EntityRelationalHelper {
  @Column({
    name: 'submitted_at',
    nullable: false,
    type: Date,
  })
  submittedAt?: Date;

  @Column({
    name: 'response_text',
    nullable: false,
    type: String,
  })
  responseText: string;

  @ManyToOne(() => ReflectionQuestionEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'question_id' })
  question: ReflectionQuestionEntity;

  @ManyToOne(() => EnrollmentEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: EnrollmentEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
