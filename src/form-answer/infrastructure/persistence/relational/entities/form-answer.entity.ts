import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { FormQuestionEntity } from '../../../../../form-question/infrastructure/persistence/relational/entities/form-question.entity';
import { FormSubmissionEntity } from '../../../../../form-submission/infrastructure/persistence/relational/entities/form-submission.entity';

@Entity({ name: 'form_answer' })
export class FormAnswerEntity extends EntityRelationalHelper {
  @ManyToOne(() => FormSubmissionEntity, { nullable: false })
  @JoinColumn({ name: 'submission_id' })
  submission: FormSubmissionEntity;
  @ManyToOne(() => FormQuestionEntity, { nullable: false })
  @JoinColumn({ name: 'question_id' })
  question: FormQuestionEntity;
  @Column({
    name: 'text_value',
    nullable: true,
    type: String,
  })
  textValue: string | null;
  @Column({
    name: 'number_value',
    nullable: true,
    type: Number,
  })
  numberValue: string | null;

  // PLAN-forms-insights B6: the theme an admin assigned to a free-text answer.
  // `themeSource` leaves room for a future AI pass; V1 only ever writes
  // 'manual'. `themeCode` references a master data code (no FK: the theme
  // groups are content, and a retired code must not orphan the answer).
  @Column({ name: 'theme_code', nullable: true, type: String })
  themeCode: string | null;
  @Column({ name: 'theme_source', nullable: true, type: String })
  themeSource: 'manual' | 'ai' | null;
  @Column({ name: 'themed_at', nullable: true, type: 'timestamptz' })
  themedAt: Date | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
