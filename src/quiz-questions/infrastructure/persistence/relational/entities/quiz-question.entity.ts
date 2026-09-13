import { LectureEntity } from '../../../../../lectures/infrastructure/persistence/relational/entities/lecture.entity';

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
  name: 'quiz_question',
})
export class QuizQuestionEntity extends EntityRelationalHelper {
  @Column({
    name: 'display_order',
    nullable: false,
    type: Number,
  })
  displayOrder: number;

  @Column({
    name: 'max_file_size_mb',
    nullable: true,
    type: Number,
  })
  maxFileSizeMb?: number | null;

  @Column({
    name: 'allowed_mime_types',
    nullable: true,
    type: String,
  })
  allowedMimeTypes?: string | null;

  @Column({
    name: 'min_word_count',
    nullable: true,
    type: Number,
  })
  minWordCount?: number | null;

  // Epic 4 v2.3 §2.1 — shown to the student only after they submit. Answer-key
  // material: never selected into a pre-submit payload.
  @Column({
    name: 'explanation',
    nullable: true,
    type: 'text',
  })
  explanation?: string | null;

  @Column({
    name: 'rating_label_max',
    nullable: true,
    type: String,
  })
  ratingLabelMax?: string | null;

  @Column({
    name: 'rating_label_min',
    nullable: true,
    type: String,
  })
  ratingLabelMin?: string | null;

  @Column({
    name: 'rating_max',
    nullable: true,
    type: Number,
  })
  ratingMax?: number | null;

  @Column({
    name: 'rating_min',
    nullable: true,
    type: Number,
  })
  ratingMin?: number | null;

  @Column({
    name: 'is_required',
    nullable: false,
    type: Boolean,
  })
  isRequired: boolean;

  @Column({
    name: 'question_type',
    nullable: false,
    type: String,
  })
  questionType: string;

  @Column({
    name: 'question_text',
    nullable: false,
    type: String,
  })
  questionText: string;

  @ManyToOne(() => LectureEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'lecture_id' })
  lecture: LectureEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
