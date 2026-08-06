import { LectureEntity } from '../../../../../lectures/infrastructure/persistence/relational/entities/lecture.entity';

import { CourseEntity } from '../../../../../courses/infrastructure/persistence/relational/entities/course.entity';

import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

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
    type: String,
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
