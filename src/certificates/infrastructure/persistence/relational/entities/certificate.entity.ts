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
    nullable: false,
    type: Date,
  })
  issuedAt?: Date;

  @ManyToOne(() => MediaFileEntity, { eager: false, nullable: true })
  file?: MediaFileEntity | null;

  @Column({
    nullable: false,
    type: Date,
  })
  completionDate: Date;

  @Column({
    nullable: false,
    type: String,
  })
  courseTitleSnapshot: string;

  @Column({
    nullable: false,
    type: String,
  })
  studentNameSnapshot: string;

  @Column({
    nullable: false,
    type: String,
  })
  certificateNumber: string;

  @ManyToOne(() => CourseEntity, { eager: true, nullable: false })
  course: CourseEntity;

  @ManyToOne(() => UserEntity, { eager: true, nullable: false })
  student: UserEntity;

  @OneToOne(() => EnrollmentEntity, { eager: true, nullable: false })
  @JoinColumn()
  enrollment: EnrollmentEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
