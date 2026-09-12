import { CourseEntity } from '../../../../../courses/infrastructure/persistence/relational/entities/course.entity';

import { InstructorEntity } from '../../../../../instructors/infrastructure/persistence/relational/entities/instructor.entity';

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

// The epic models this as a composite-PK join table. The project's entities
// all carry a generated uuid id, so the pairing is enforced by the unique
// index below instead. The "exactly one primary per course" rule is the
// partial unique index; the application also demotes the outgoing primary
// before promoting the incoming one so a normal edit never trips it.
@Index('IDX_course_instructor_pair_unique', ['course', 'instructor'], {
  unique: true,
})
@Index('IDX_course_instructor_one_primary', ['course'], {
  unique: true,
  where: `"role" = 'primary'`,
})
@Index('IDX_course_instructor_instructorId', ['instructor', 'course'])
@Check(
  'CK_course_instructor_role',
  `"role" IN ('primary', 'co_instructor', 'guest')`,
)
@Entity({
  name: 'course_instructor',
})
export class CourseInstructorEntity extends EntityRelationalHelper {
  @ManyToOne(() => CourseEntity, {
    eager: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  course: CourseEntity;

  @ManyToOne(() => InstructorEntity, { eager: true, nullable: false })
  instructor: InstructorEntity;

  @Column({
    nullable: false,
    type: String,
    default: 'primary',
  })
  role: string;

  @Column({
    nullable: false,
    type: Number,
    default: 0,
  })
  displayOrder: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
