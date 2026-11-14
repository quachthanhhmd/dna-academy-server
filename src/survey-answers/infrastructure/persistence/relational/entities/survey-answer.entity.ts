import { SurveyQuestionOptionEntity } from '../../../../../survey-question-options/infrastructure/persistence/relational/entities/survey-question-option.entity';

import { SurveyQuestionEntity } from '../../../../../survey-questions/infrastructure/persistence/relational/entities/survey-question.entity';

import { SurveyResponseEntity } from '../../../../../survey-responses/infrastructure/persistence/relational/entities/survey-response.entity';

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
 * One answered value. Shaped for the dashboard to aggregate with plain SQL:
 *
 * - single/multiple choice: one row per chosen option, `option_id` set —
 *   `COUNT(*) GROUP BY option_id` is the distribution.
 * - rating_scale: one row, `rating_value` set.
 * - short/long text: one row, `text_answer` set.
 */
@Entity({
  name: 'survey_answer',
})
@Index('IDX_survey_answer_response', ['response'])
@Index('IDX_survey_answer_question', ['question'])
export class SurveyAnswerEntity extends EntityRelationalHelper {
  @ManyToOne(() => SurveyQuestionOptionEntity, {
    eager: false,
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'option_id' })
  option?: SurveyQuestionOptionEntity | null;

  @ManyToOne(() => SurveyQuestionEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question: SurveyQuestionEntity;

  @ManyToOne(() => SurveyResponseEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'response_id' })
  response: SurveyResponseEntity;

  @Column({ name: 'rating_value', nullable: true, type: 'smallint' })
  ratingValue?: number | null;

  @Column({ name: 'text_answer', nullable: true, type: 'text' })
  textAnswer?: string | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
