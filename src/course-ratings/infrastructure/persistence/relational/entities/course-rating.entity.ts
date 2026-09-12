import { CourseEntity } from '../../../../../courses/infrastructure/persistence/relational/entities/course.entity';

import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import { EnrollmentEntity } from '../../../../../enrollments/infrastructure/persistence/relational/entities/enrollment.entity';

import {
  Check,
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

@Check('CK_course_rating_1_5', `"rating" BETWEEN 1 AND 5`)
@Entity({
  name: 'course_rating',
})
export class CourseRatingEntity extends EntityRelationalHelper {
  @Column({
    name: 'submitted_at',
    nullable: false,
    type: Date,
  })
  submittedAt?: Date;

  @Column({
    name: 'review_status',
    nullable: false,
    type: String,
  })
  reviewStatus: string;

  @Column({
    name: 'review_text',
    nullable: true,
    type: String,
  })
  reviewText?: string | null;

  @Column({
    name: 'rating',
    nullable: false,
    type: Number,
  })
  rating: number;

  @ManyToOne(() => CourseEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;

  @ManyToOne(() => UserEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'student_id' })
  student: UserEntity;

  @OneToOne(() => EnrollmentEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: EnrollmentEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
