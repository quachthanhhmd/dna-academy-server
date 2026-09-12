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
    type: Date,
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
    type: Date,
  })
  completedAt?: Date | null;

  @Column({
    name: 'started_at',
    nullable: true,
    type: Date,
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
    type: Date,
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
