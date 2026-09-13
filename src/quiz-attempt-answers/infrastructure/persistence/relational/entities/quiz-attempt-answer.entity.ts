import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import { MediaFileEntity } from '../../../../../media-files/infrastructure/persistence/relational/entities/media-file.entity';

import { QuizAnswerOptionEntity } from '../../../../../quiz-answer-options/infrastructure/persistence/relational/entities/quiz-answer-option.entity';

import { QuizQuestionEntity } from '../../../../../quiz-questions/infrastructure/persistence/relational/entities/quiz-question.entity';

import { QuizAttemptEntity } from '../../../../../quiz-attempts/infrastructure/persistence/relational/entities/quiz-attempt.entity';

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
  name: 'quiz_attempt_answer',
})
export class QuizAttemptAnswerEntity extends EntityRelationalHelper {
  @Column({
    name: 'graded_at',
    nullable: true,
    type: 'timestamptz',
  })
  gradedAt?: Date | null;

  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'graded_by_id' })
  gradedBy?: UserEntity | null;

  @Column({
    name: 'score',
    nullable: true,
    type: Number,
  })
  score?: number | null;

  @Column({
    name: 'is_correct',
    nullable: true,
    type: Boolean,
  })
  isCorrect?: boolean | null;

  @ManyToOne(() => MediaFileEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'file_id' })
  file?: MediaFileEntity | null;

  @Column({
    name: 'rating_answer',
    nullable: true,
    type: Number,
  })
  ratingAnswer?: number | null;

  @Column({
    name: 'text_answer',
    nullable: true,
    type: String,
  })
  textAnswer?: string | null;

  @Column({
    name: 'selected_option_ids',
    nullable: true,
    type: String,
  })
  selectedOptionIds?: string | null;

  @ManyToOne(() => QuizAnswerOptionEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'selected_option_id' })
  selectedOption?: QuizAnswerOptionEntity | null;

  @ManyToOne(() => QuizQuestionEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'question_id' })
  question: QuizQuestionEntity;

  @ManyToOne(() => QuizAttemptEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'attempt_id' })
  attempt: QuizAttemptEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
