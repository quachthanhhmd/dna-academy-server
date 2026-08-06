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
  name: 'quiz_attempt',
})
export class QuizAttemptEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: Date,
  })
  submittedAt?: Date | null;

  @Column({
    nullable: true,
    type: Boolean,
  })
  passed?: boolean | null;

  @Column({
    nullable: true,
    type: Number,
  })
  score?: number | null;

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
