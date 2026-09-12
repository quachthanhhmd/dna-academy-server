import { LectureEntity } from '../../../../../lectures/infrastructure/persistence/relational/entities/lecture.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'lecture_content_document',
})
export class LectureContentDocumentEntity extends EntityRelationalHelper {
  @Column({
    name: 'is_downloadable',
    nullable: false,
    type: Boolean,
  })
  isDownloadable: boolean;

  @Column({
    name: 'file_name',
    nullable: true,
    type: String,
  })
  fileName?: string | null;

  @Column({
    name: 'file_url',
    nullable: false,
    type: String,
  })
  fileUrl: string;

  @OneToOne(() => LectureEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'lecture_id' })
  lecture: LectureEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
