import { CourseEntity } from '../../../../../courses/infrastructure/persistence/relational/entities/course.entity';

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
  name: 'career_reflection_question',
})
export class CareerReflectionQuestionEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: Boolean,
  })
  isActive: boolean;

  @Column({
    nullable: false,
    type: Number,
  })
  displayOrder: number;

  @Column({
    nullable: false,
    type: String,
  })
  questionText: string;

  @ManyToOne(() => CourseEntity, { eager: false, nullable: true })
  course?: CourseEntity | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
