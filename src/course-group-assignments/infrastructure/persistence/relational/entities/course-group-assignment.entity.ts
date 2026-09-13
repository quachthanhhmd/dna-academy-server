import { MasterDataCodeEntity } from '../../../../../master-data-codes/infrastructure/persistence/relational/entities/master-data-code.entity';

import { CourseEntity } from '../../../../../courses/infrastructure/persistence/relational/entities/course.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'course_group_assignment',
})
export class CourseGroupAssignmentEntity extends EntityRelationalHelper {
  @ManyToOne(() => MasterDataCodeEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'group_id' })
  group: MasterDataCodeEntity;

  @ManyToOne(() => CourseEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
