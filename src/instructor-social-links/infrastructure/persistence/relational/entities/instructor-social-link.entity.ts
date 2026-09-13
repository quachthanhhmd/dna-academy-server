import { InstructorEntity } from '../../../../../instructors/infrastructure/persistence/relational/entities/instructor.entity';

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
  @JoinColumn({ name: 'instructor_id' })
  instructor: InstructorEntity;

  @Column({
    name: 'platform',
    nullable: false,
    type: String,
  })
  platform: string;

  @Column({
    name: 'url',
    nullable: false,
    type: 'text',
  })
  url: string;

  @Column({
    name: 'display_order',
    nullable: false,
    type: Number,
    default: 0,
  })
  displayOrder: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
