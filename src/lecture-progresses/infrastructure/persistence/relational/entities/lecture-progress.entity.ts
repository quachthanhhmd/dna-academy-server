import { LectureEntity } from '../../../../../lectures/infrastructure/persistence/relational/entities/lecture.entity';

import { EnrollmentEntity } from '../../../../../enrollments/infrastructure/persistence/relational/entities/enrollment.entity';

import {
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  JoinColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Index('IDX_lecture_progress_enrollment_status', ['enrollment', 'status'])
@Index('UX_lecture_progress_enrollment_lecture', ['enrollment', 'lecture'], {
  unique: true,
})
@Entity({
  name: 'lecture_progress',
})
export class LectureProgressEntity extends EntityRelationalHelper {
  @Column({
    name: 'watch_duration_secs',
    nullable: false,
    type: Number,
  })
  watchDurationSecs?: number;

  @Column({
    name: 'completed_at',
    nullable: true,
    type: 'timestamptz',
  })
  completedAt?: Date | null;

  @Column({
    name: 'started_at',
    nullable: true,
    type: 'timestamptz',
  })
  startedAt?: Date | null;

  @Column({
    name: 'status',
    nullable: false,
    type: String,
  })
  status: string;

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
