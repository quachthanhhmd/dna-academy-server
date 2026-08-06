import { MasterDataCodeEntity } from '../../../../../master-data-codes/infrastructure/persistence/relational/entities/master-data-code.entity';

import { CourseEntity } from '../../../../../courses/infrastructure/persistence/relational/entities/course.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'course_group_assignment',
})
export class CourseGroupAssignmentEntity extends EntityRelationalHelper {
  @ManyToOne(() => MasterDataCodeEntity, { eager: true, nullable: false })
  group: MasterDataCodeEntity;

  @ManyToOne(() => CourseEntity, { eager: true, nullable: false })
  course: CourseEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
