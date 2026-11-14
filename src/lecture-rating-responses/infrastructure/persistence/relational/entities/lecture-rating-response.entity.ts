import { EnrollmentEntity } from '../../../../../enrollments/infrastructure/persistence/relational/entities/enrollment.entity';

import { LectureEntity } from '../../../../../lectures/infrastructure/persistence/relational/entities/lecture.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

/**
 * A learner's answer to a "Đánh giá" lesson. One per lesson per enrollment:
 * rating again replaces it.
 */
@Entity({
  name: 'lecture_rating_response',
})
@Unique('UQ_lecture_rating_response_lecture_enrollment', [
  'lecture',
  'enrollment',
])
export class LectureRatingResponseEntity extends EntityRelationalHelper {
  @ManyToOne(() => EnrollmentEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: EnrollmentEntity;

  @ManyToOne(() => LectureEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lecture_id' })
  lecture: LectureEntity;

  @Column({ name: 'submitted_at', nullable: false, type: 'timestamptz' })
  submittedAt: Date;

  @Column({ name: 'comment', nullable: true, type: String })
  comment?: string | null;

  /** 1–5, enforced by CK_lecture_rating_response_rating_1_5. */
  @Column({ name: 'rating', nullable: false, type: 'smallint' })
  rating: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
