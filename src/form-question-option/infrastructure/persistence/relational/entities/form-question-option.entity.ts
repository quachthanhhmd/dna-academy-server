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

@Entity({ name: 'form_question_option' })
export class FormQuestionOptionEntity extends EntityRelationalHelper {
  @ManyToOne(() => FormQuestionEntity, { nullable: false })
  @JoinColumn({ name: 'question_id' })
  question: FormQuestionEntity;
  @Column({
    name: 'option_code',
    nullable: false,
    type: String,
  })
  optionCode: string;
  @Column({
    name: 'display_order',
    nullable: false,
    type: Number,
  })
  displayOrder: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
