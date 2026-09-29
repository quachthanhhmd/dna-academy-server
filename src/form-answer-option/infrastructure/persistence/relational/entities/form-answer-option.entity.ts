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
import { FormAnswerEntity } from '../../../../../form-answer/infrastructure/persistence/relational/entities/form-answer.entity';
import { FormQuestionEntity } from '../../../../../form-question/infrastructure/persistence/relational/entities/form-question.entity';
import { FormSubmissionEntity } from '../../../../../form-submission/infrastructure/persistence/relational/entities/form-submission.entity';

@Entity({ name: 'form_answer_option' })
export class FormAnswerOptionEntity extends EntityRelationalHelper {
  @ManyToOne(() => FormAnswerEntity, { nullable: false })
  @JoinColumn({ name: 'answer_id' })
  answer: FormAnswerEntity;
  @ManyToOne(() => FormQuestionEntity, { nullable: false })
  @JoinColumn({ name: 'question_id' })
  question: FormQuestionEntity;
  @ManyToOne(() => FormSubmissionEntity, { nullable: false })
  @JoinColumn({ name: 'submission_id' })
  submission: FormSubmissionEntity;
  @Column({
    name: 'option_code',
    nullable: false,
    type: String,
  })
  optionCode: string;
  @Column({
    name: 'option_group_key',
    nullable: true,
    type: String,
  })
  optionGroupKey: string | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
