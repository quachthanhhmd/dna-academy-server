import { SectionEntity } from '../../../../../sections/infrastructure/persistence/relational/entities/section.entity';

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

@Index('IDX_lecture_section_display_order', ['section', 'displayOrder'])
@Entity({
  name: 'lecture',
})
export class LectureEntity extends EntityRelationalHelper {
  @Column({
    name: 'status',
    nullable: false,
    type: String,
  })
  status: string;

  @Column({
    name: 'display_order',
    nullable: false,
    type: Number,
  })
  displayOrder: number;

  @Column({
    name: 'requires_completion',
    nullable: false,
    type: Boolean,
  })
  requiresCompletion: boolean;

  @Column({
    name: 'is_preview',
    nullable: false,
    type: Boolean,
  })
  isPreview: boolean;

  @Column({
    name: 'duration_secs',
    nullable: false,
    type: Number,
  })
  durationSecs: number;

  @Column({
    name: 'lecture_type',
    nullable: false,
    type: String,
  })
  lectureType: string;

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

  @ManyToOne(() => SectionEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'section_id' })
  section: SectionEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
