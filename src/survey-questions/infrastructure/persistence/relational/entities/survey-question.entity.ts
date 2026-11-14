import { LectureEntity } from '../../../../../lectures/infrastructure/persistence/relational/entities/lecture.entity';

import {
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

/**
 * One question of a survey lesson. Its id is stable across edits, so the
 * answers already given keep pointing at it. Removing a question that has
 * answers archives it (`archived_at`) instead of deleting it — the answers
 * stay for the dashboard; learners no longer see the question.
 */
@Entity({
  name: 'survey_question',
})
@Index('IDX_survey_question_lecture', ['lecture'])
export class SurveyQuestionEntity extends EntityRelationalHelper {
  @ManyToOne(() => LectureEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lecture_id' })
  lecture: LectureEntity;

  @Column({ name: 'archived_at', nullable: true, type: 'timestamptz' })
  archivedAt?: Date | null;

  @Column({ name: 'rating_label_max', nullable: true, type: String })
  ratingLabelMax?: string | null;

  @Column({ name: 'rating_label_min', nullable: true, type: String })
  ratingLabelMin?: string | null;

  /** rating_scale only: 5 or 10 (CK_survey_question_rating_max). */
  @Column({ name: 'rating_max', nullable: true, type: 'smallint' })
  ratingMax?: number | null;

  @Column({ name: 'display_order', nullable: false, type: Number })
  displayOrder: number;

  @Column({ name: 'is_required', nullable: false, type: Boolean })
  isRequired: boolean;

  @Column({ name: 'question_text', nullable: false, type: String })
  questionText: string;

  /** single_choice | multiple_choice | rating_scale | short_text | long_text */
  @Column({ name: 'question_type', nullable: false, type: String })
  questionType: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
