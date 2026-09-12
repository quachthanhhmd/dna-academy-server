import { LectureEntity } from '../../../../../lectures/infrastructure/persistence/relational/entities/lecture.entity';

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
  name: 'quiz_question',
})
export class QuizQuestionEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: Number,
  })
  displayOrder: number;

  @Column({
    nullable: true,
    type: Number,
  })
  maxFileSizeMb?: number | null;

  @Column({
    nullable: true,
    type: String,
  })
  allowedMimeTypes?: string | null;

  @Column({
    nullable: true,
    type: Number,
  })
  minWordCount?: number | null;

  // Epic 4 v2.3 §2.1 — shown to the student only after they submit. Answer-key
  // material: never selected into a pre-submit payload.
  @Column({
    nullable: true,
    type: 'text',
  })
  explanation?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  ratingLabelMax?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  ratingLabelMin?: string | null;

  @Column({
    nullable: true,
    type: Number,
  })
  ratingMax?: number | null;

  @Column({
    nullable: true,
    type: Number,
  })
  ratingMin?: number | null;

  @Column({
    nullable: false,
    type: Boolean,
  })
  isRequired: boolean;

  @Column({
    nullable: false,
    type: String,
  })
  questionType: string;

  @Column({
    nullable: false,
    type: String,
  })
  questionText: string;

  @ManyToOne(() => LectureEntity, { eager: true, nullable: false })
  lecture: LectureEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
