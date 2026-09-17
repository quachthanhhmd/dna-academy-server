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
  Index,
  Unique,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

// Epic 4.6 D4 — one answer per question per enrolment, so a re-submit is an
// upsert rather than a second row. Its leading column is `enrollment_id`,
// which is why Epic 7's standalone index on that column was dropped: this
// one answers the same lookups.
@Unique('UQ_cra_enrollment_question', ['enrollment', 'question'])
// Epic 7 BE-8 — the dashboard groups answers by question. Postgres indexes
// the *referenced* key of a foreign key, never the referencing column.
@Index('IDX_cra_question', ['question'])
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
