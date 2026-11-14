import { EnrollmentEntity } from '../../../../../enrollments/infrastructure/persistence/relational/entities/enrollment.entity';

import { LectureEntity } from '../../../../../lectures/infrastructure/persistence/relational/entities/lecture.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

/**
 * A learner's submission of a survey lesson: one per lesson per enrollment.
 * Submitting again updates it (`submitted_at` is the latest submit) and
 * replaces its answers.
 */
@Entity({
  name: 'survey_response',
})
@Unique('UQ_survey_response_lecture_enrollment', ['lecture', 'enrollment'])
export class SurveyResponseEntity extends EntityRelationalHelper {
  @ManyToOne(() => EnrollmentEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: EnrollmentEntity;

  @ManyToOne(() => LectureEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lecture_id' })
  lecture: LectureEntity;

  @Column({ name: 'submitted_at', nullable: false, type: 'timestamptz' })
  submittedAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
