import { CareerReflectionQuestionEntity } from '../../../../../career-reflection-questions/infrastructure/persistence/relational/entities/career-reflection-question.entity';

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
  name: 'career_reflection_answer',
})
export class CareerReflectionAnswerEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: Date,
  })
  submittedAt?: Date;

  @Column({
    nullable: true,
    type: String,
  })
  textAnswer?: string | null;

  @Column({
    nullable: true,
    type: Number,
  })
  ratingAnswer?: number | null;

  @ManyToOne(() => CareerReflectionQuestionEntity, {
    eager: true,
    nullable: false,
  })
  question: CareerReflectionQuestionEntity;

  @ManyToOne(() => EnrollmentEntity, { eager: true, nullable: false })
  enrollment: EnrollmentEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
