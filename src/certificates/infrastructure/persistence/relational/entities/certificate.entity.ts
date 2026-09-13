import { MediaFileEntity } from '../../../../../media-files/infrastructure/persistence/relational/entities/media-file.entity';

import { CourseEntity } from '../../../../../courses/infrastructure/persistence/relational/entities/course.entity';

import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import { EnrollmentEntity } from '../../../../../enrollments/infrastructure/persistence/relational/entities/enrollment.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
  ManyToOne,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'certificate',
})
export class CertificateEntity extends EntityRelationalHelper {
  @Column({
    name: 'issued_at',
    nullable: false,
    type: 'timestamptz',
  })
  issuedAt?: Date;

  @ManyToOne(() => MediaFileEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'file_id' })
  file?: MediaFileEntity | null;

  @Column({
    name: 'completion_date',
    nullable: false,
    type: 'timestamptz',
  })
  completionDate: Date;

  @Column({
    name: 'course_title_snapshot',
    nullable: false,
    type: String,
  })
  courseTitleSnapshot: string;

  @Column({
    name: 'student_name_snapshot',
    nullable: false,
    type: String,
  })
  studentNameSnapshot: string;

  @Column({
    name: 'certificate_number',
    nullable: false,
    type: String,
  })
  certificateNumber: string;

  @ManyToOne(() => CourseEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;

  @ManyToOne(() => UserEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'student_id' })
  student: UserEntity;

  @OneToOne(() => EnrollmentEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: EnrollmentEntity;

  // Epic 4.5 §1.5 — frozen at issue time and never recomputed, so the grade
  // beside a certificate cannot drift from the certificate itself. NULL means
  // the student submitted no quiz, which renders as no grade row at all.
  @Column({ name: 'final_grade_pct', nullable: true, type: 'smallint' })
  finalGradePct?: number | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
