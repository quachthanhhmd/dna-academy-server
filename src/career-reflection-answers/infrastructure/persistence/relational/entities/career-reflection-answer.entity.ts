import { CareerReflectionQuestionEntity } from '../../../../../career-reflection-questions/infrastructure/persistence/relational/entities/career-reflection-question.entity';

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
  name: 'career_reflection_answer',
})
export class CareerReflectionAnswerEntity extends EntityRelationalHelper {
  @Column({
    name: 'submitted_at',
    nullable: false,
    type: 'timestamptz',
  })
  submittedAt?: Date;

  @Column({
    name: 'text_answer',
    nullable: true,
    type: String,
  })
  textAnswer?: string | null;

  @Column({
    name: 'rating_answer',
    nullable: true,
    type: Number,
  })
  ratingAnswer?: number | null;

  @ManyToOne(() => CareerReflectionQuestionEntity, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({ name: 'question_id' })
  question: CareerReflectionQuestionEntity;

  @ManyToOne(() => EnrollmentEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: EnrollmentEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
