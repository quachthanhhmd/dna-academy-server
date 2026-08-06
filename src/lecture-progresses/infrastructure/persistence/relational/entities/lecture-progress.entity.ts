import { LectureEntity } from '../../../../../lectures/infrastructure/persistence/relational/entities/lecture.entity';

import { EnrollmentEntity } from '../../../../../enrollments/infrastructure/persistence/relational/entities/enrollment.entity';

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
  name: 'lecture_progress',
})
export class LectureProgressEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: Number,
  })
  watchDurationSecs?: number;

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
    nullable: false,
    type: String,
  })
  status: string;

  @ManyToOne(() => LectureEntity, { eager: true, nullable: false })
  lecture: LectureEntity;

  @ManyToOne(() => EnrollmentEntity, { eager: true, nullable: false })
  enrollment: EnrollmentEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
