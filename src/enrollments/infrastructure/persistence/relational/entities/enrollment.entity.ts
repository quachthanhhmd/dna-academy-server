import { LectureEntity } from '../../../../../lectures/infrastructure/persistence/relational/entities/lecture.entity';

import { CourseEntity } from '../../../../../courses/infrastructure/persistence/relational/entities/course.entity';

import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import {
  Check,
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
import { ENROLLMENT_SOURCES } from '../../../../enrollment.constants';

// Epic 4 v2 §2.1 — one live enrollment per (student, course); a cancelled row
// does not block re-enrolling.
@Index('UX_enrollment_active', ['student', 'course'], {
  unique: true,
  where: `"status" <> 'cancelled'`,
})
@Index('IDX_enrollment_student_status', ['student', 'status'])
// Epic 7 BE-8 — every dashboard metric filters on one of these three dates.
// The two nullable ones are partial: `completed_at` is null for every
// enrolment still running and `last_accessed_at` for every one never opened,
// so excluding the nulls keeps each index proportional to the rows that are
// actually queried.
@Index('IDX_enrollment_enrollment_date', ['enrollmentDate'])
@Index('IDX_enrollment_completed_at', ['completedAt'], {
  where: `"completed_at" IS NOT NULL`,
})
@Index('IDX_enrollment_last_accessed_at', ['lastAccessedAt'], {
  where: `"last_accessed_at" IS NOT NULL`,
})
@Check('CK_enrollment_progress_0_100', `"progress_pct" BETWEEN 0 AND 100`)
@Entity({
  name: 'enrollment',
})
export class EnrollmentEntity extends EntityRelationalHelper {
  @ManyToOne(() => LectureEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'last_lecture_id' })
  lastLecture?: LectureEntity | null;

  @Column({
    name: 'last_accessed_at',
    nullable: true,
    type: 'timestamptz',
  })
  lastAccessedAt?: Date | null;

  @Column({
    name: 'progress_pct',
    nullable: false,
    type: Number,
  })
  progressPct?: number;

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
    name: 'enrollment_source',
    nullable: true,
    type: 'enum',
    enum: ENROLLMENT_SOURCES,
    enumName: 'enrollment_source_enum',
  })
  enrollmentSource?: string | null;

  @Column({
    name: 'enrollment_date',
    nullable: false,
    type: 'timestamptz',
  })
  enrollmentDate?: Date;

  @Column({
    name: 'status',
    nullable: false,
    type: String,
  })
  status: string;

  @ManyToOne(() => CourseEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;

  @ManyToOne(() => UserEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'student_id' })
  student: UserEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
