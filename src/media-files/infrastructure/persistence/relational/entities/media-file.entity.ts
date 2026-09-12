import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'media_file',
})
export class MediaFileEntity extends EntityRelationalHelper {
  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy?: UserEntity | null;

  @Column({
    name: 'status',
    nullable: false,
    type: String,
  })
  status: string;

  @Column({
    name: 'size_bytes',
    nullable: true,
    type: Number,
  })
  sizeBytes?: number | null;

  @Column({
    name: 'mime_type',
    nullable: true,
    type: String,
  })
  mimeType?: string | null;

  @Column({
    name: 'file_name',
    nullable: true,
    type: String,
  })
  fileName?: string | null;

  @Column({
    name: 'object_key',
    nullable: false,
    type: String,
  })
  objectKey: string;

  @Column({
    name: 'bucket',
    nullable: false,
    type: String,
  })
  bucket: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
