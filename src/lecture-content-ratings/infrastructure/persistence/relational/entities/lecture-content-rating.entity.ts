import { LectureEntity } from '../../../../../lectures/infrastructure/persistence/relational/entities/lecture.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

/** The authored side of a "Đánh giá" lesson: one 1–5 question. */
@Entity({
  name: 'lecture_content_rating',
})
export class LectureContentRatingEntity extends EntityRelationalHelper {
  @OneToOne(() => LectureEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lecture_id' })
  lecture: LectureEntity;

  @Column({ name: 'allow_comment', nullable: false, type: Boolean })
  allowComment: boolean;

  @Column({ name: 'label_max', nullable: true, type: String })
  labelMax?: string | null;

  @Column({ name: 'label_min', nullable: true, type: String })
  labelMin?: string | null;

  @Column({ name: 'prompt', nullable: false, type: String })
  prompt: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
