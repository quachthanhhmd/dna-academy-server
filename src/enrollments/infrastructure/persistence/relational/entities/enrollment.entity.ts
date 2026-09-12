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
@Check('CK_enrollment_progress_0_100', `"progressPct" BETWEEN 0 AND 100`)
@Entity({
  name: 'enrollment',
})
export class EnrollmentEntity extends EntityRelationalHelper {
  @ManyToOne(() => LectureEntity, { eager: false, nullable: true })
  lastLecture?: LectureEntity | null;

  @Column({
    nullable: true,
    type: Date,
  })
  lastAccessedAt?: Date | null;

  @Column({
    nullable: false,
    type: Number,
  })
  progressPct?: number;

  @Column({
    nullable: true,
    type: Date,
  })
  completedAt?: Date | null;

  @Column({
    nullable: true,
    type: Date,
  })
  startedAt?: Date | null;

  @Column({
    nullable: true,
    type: 'enum',
    enum: ENROLLMENT_SOURCES,
    enumName: 'enrollment_source_enum',
  })
  enrollmentSource?: string | null;

  @Column({
    nullable: false,
    type: Date,
  })
  enrollmentDate?: Date;

  @Column({
    nullable: false,
    type: String,
  })
  status: string;

  @ManyToOne(() => CourseEntity, { eager: true, nullable: false })
  course: CourseEntity;

  @ManyToOne(() => UserEntity, { eager: true, nullable: false })
  student: UserEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
