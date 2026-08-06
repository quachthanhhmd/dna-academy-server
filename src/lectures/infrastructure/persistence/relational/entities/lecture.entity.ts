import { SectionEntity } from '../../../../../sections/infrastructure/persistence/relational/entities/section.entity';

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
  name: 'lecture',
})
export class LectureEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: String,
  })
  status: string;

  @Column({
    nullable: false,
    type: Number,
  })
  displayOrder: number;

  @Column({
    nullable: false,
    type: Boolean,
  })
  requiresCompletion: boolean;

  @Column({
    nullable: false,
    type: Boolean,
  })
  isPreview: boolean;

  @Column({
    nullable: false,
    type: Number,
  })
  durationSecs: number;

  @Column({
    nullable: false,
    type: String,
  })
  lectureType: string;

  @Column({
    nullable: true,
    type: String,
  })
  description?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  title: string;

  @ManyToOne(() => SectionEntity, { eager: true, nullable: false })
  section: SectionEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
