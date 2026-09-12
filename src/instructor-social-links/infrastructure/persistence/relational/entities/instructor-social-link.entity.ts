import { InstructorEntity } from '../../../../../instructors/infrastructure/persistence/relational/entities/instructor.entity';

import {
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Index('IDX_instructor_social_link_instructorId', ['instructor'])
@Entity({
  name: 'instructor_social_link',
})
export class InstructorSocialLinkEntity extends EntityRelationalHelper {
  @ManyToOne(() => InstructorEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  instructor: InstructorEntity;

  @Column({
    nullable: false,
    type: String,
  })
  platform: string;

  @Column({
    nullable: false,
    type: 'text',
  })
  url: string;

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
