import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'media_file',
})
export class MediaFileEntity extends EntityRelationalHelper {
  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  uploadedBy?: UserEntity | null;

  @Column({
    nullable: false,
    type: String,
  })
  status: string;

  @Column({
    nullable: true,
    type: Number,
  })
  sizeBytes?: number | null;

  @Column({
    nullable: true,
    type: String,
  })
  mimeType?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  fileName?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  objectKey: string;

  @Column({
    nullable: false,
    type: String,
  })
  bucket: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
