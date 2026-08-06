import { QuizQuestionEntity } from '../../../../../quiz-questions/infrastructure/persistence/relational/entities/quiz-question.entity';

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
  name: 'quiz_answer_option',
})
export class QuizAnswerOptionEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: Number,
  })
  displayOrder: number;

  @Column({
    nullable: false,
    type: Boolean,
  })
  isCorrect: boolean;

  @Column({
    nullable: false,
    type: String,
  })
  optionText: string;

  @ManyToOne(() => QuizQuestionEntity, { eager: true, nullable: false })
  question: QuizQuestionEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
