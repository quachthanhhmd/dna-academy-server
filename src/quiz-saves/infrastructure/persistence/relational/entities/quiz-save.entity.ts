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
  name: 'quiz_save',
})
export class QuizSaveEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: Date,
  })
  savedAt?: Date;

  @Column({
    nullable: false,
    type: String,
  })
  answersJson: string;

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
