import { LectureEntity } from '../../../../../lectures/infrastructure/persistence/relational/entities/lecture.entity';

import { EnrollmentEntity } from '../../../../../enrollments/infrastructure/persistence/relational/entities/enrollment.entity';

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
  name: 'quiz_attempt',
})
export class QuizAttemptEntity extends EntityRelationalHelper {
  @Column({
    name: 'submitted_at',
    nullable: true,
    type: 'timestamptz',
  })
  submittedAt?: Date | null;

  @Column({
    name: 'passed',
    nullable: true,
    type: Boolean,
  })
  passed?: boolean | null;

  @Column({
    name: 'score',
    nullable: true,
    type: Number,
  })
  score?: number | null;

  @ManyToOne(() => LectureEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'lecture_id' })
  lecture: LectureEntity;

  @ManyToOne(() => EnrollmentEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: EnrollmentEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
