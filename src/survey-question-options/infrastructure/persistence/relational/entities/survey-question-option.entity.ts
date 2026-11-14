import { SurveyQuestionEntity } from '../../../../../survey-questions/infrastructure/persistence/relational/entities/survey-question.entity';

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
 * A choice of a single/multiple-choice survey question. Like the question,
 * an option that has been chosen is archived rather than deleted.
 */
@Entity({
  name: 'survey_question_option',
})
@Index('IDX_survey_question_option_question', ['question'])
export class SurveyQuestionOptionEntity extends EntityRelationalHelper {
  @ManyToOne(() => SurveyQuestionEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question: SurveyQuestionEntity;

  @Column({ name: 'archived_at', nullable: true, type: 'timestamptz' })
  archivedAt?: Date | null;

  @Column({ name: 'display_order', nullable: false, type: Number })
  displayOrder: number;

  @Column({ name: 'option_text', nullable: false, type: String })
  optionText: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
