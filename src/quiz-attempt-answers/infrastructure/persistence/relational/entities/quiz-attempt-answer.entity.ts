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
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'quiz_attempt_answer',
})
export class QuizAttemptAnswerEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: Date,
  })
  gradedAt?: Date | null;

  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  gradedBy?: UserEntity | null;

  @Column({
    nullable: true,
    type: Number,
  })
  score?: number | null;

  @Column({
    nullable: true,
    type: Boolean,
  })
  isCorrect?: boolean | null;

  @ManyToOne(() => MediaFileEntity, { eager: false, nullable: true })
  file?: MediaFileEntity | null;

  @Column({
    nullable: true,
    type: Number,
  })
  ratingAnswer?: number | null;

  @Column({
    nullable: true,
    type: String,
  })
  textAnswer?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  selectedOptionIds?: string | null;

  @ManyToOne(() => QuizAnswerOptionEntity, { eager: false, nullable: true })
  selectedOption?: QuizAnswerOptionEntity | null;

  @ManyToOne(() => QuizQuestionEntity, { eager: true, nullable: false })
  question: QuizQuestionEntity;

  @ManyToOne(() => QuizAttemptEntity, { eager: true, nullable: false })
  attempt: QuizAttemptEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
