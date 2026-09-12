import { CourseEntity } from '../../../../../courses/infrastructure/persistence/relational/entities/course.entity';

import {
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

@Index('IDX_section_course_display_order', ['course', 'displayOrder'])
@Entity({
  name: 'section',
})
export class SectionEntity extends EntityRelationalHelper {
  @Column({
    name: 'display_order',
    nullable: false,
    type: Number,
  })
  displayOrder: number;

  @Column({
    name: 'learning_objective',
    nullable: true,
    type: String,
  })
  learningObjective?: string | null;

  @Column({
    name: 'description',
    nullable: true,
    type: String,
  })
  description?: string | null;

  @Column({
    name: 'title',
    nullable: false,
    type: String,
  })
  title: string;

  @ManyToOne(() => CourseEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
