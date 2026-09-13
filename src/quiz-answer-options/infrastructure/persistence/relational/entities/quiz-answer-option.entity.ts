import { QuizQuestionEntity } from '../../../../../quiz-questions/infrastructure/persistence/relational/entities/quiz-question.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  JoinColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'quiz_answer_option',
})
export class QuizAnswerOptionEntity extends EntityRelationalHelper {
  @Column({
    name: 'display_order',
    nullable: false,
    type: Number,
  })
  displayOrder: number;

  @Column({
    name: 'is_correct',
    nullable: false,
    type: Boolean,
  })
  isCorrect: boolean;

  @Column({
    name: 'option_text',
    nullable: false,
    type: String,
  })
  optionText: string;

  @ManyToOne(() => QuizQuestionEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'question_id' })
  question: QuizQuestionEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
