import { LectureEntity } from '../../../../../lectures/infrastructure/persistence/relational/entities/lecture.entity';
import { MediaFileEntity } from '../../../../../media-files/infrastructure/persistence/relational/entities/media-file.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
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

  /**
   * A URL stored as given, from before documents were uploaded files. Null
   * once `file` is set: a private file has no URL worth storing — it is
   * presigned each time it is read.
   */
  @Column({
    name: 'file_url',
    nullable: true,
    type: String,
  })
  fileUrl?: string | null;

  @ManyToOne(() => MediaFileEntity, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'file_id' })
  file?: MediaFileEntity | null;

  @OneToOne(() => LectureEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'lecture_id' })
  lecture: LectureEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
