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

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
