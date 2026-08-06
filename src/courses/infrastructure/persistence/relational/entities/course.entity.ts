import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import { MasterDataCodeEntity } from '../../../../../master-data-codes/infrastructure/persistence/relational/entities/master-data-code.entity';

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
  name: 'course',
})
export class CourseEntity extends EntityRelationalHelper {
  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  createdBy?: UserEntity | null;

  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  publishedBy?: UserEntity | null;

  @Column({
    nullable: true,
    type: Date,
  })
  publishedAt?: Date | null;

  @Column({
    nullable: true,
    type: Number,
  })
  avgRating?: number | null;

  @Column({
    nullable: false,
    type: Number,
  })
  totalEnrollments?: number;

  @Column({
    nullable: false,
    type: Number,
  })
  totalDurationSecs?: number;

  @Column({
    nullable: false,
    type: Number,
  })
  totalLectures?: number;

  @Column({
    nullable: false,
    type: Number,
  })
  totalSections?: number;

  @ManyToOne(() => UserEntity, { eager: true, nullable: true })
  instructor?: UserEntity | null;

  @ManyToOne(() => MasterDataCodeEntity, { eager: true, nullable: true })
  category?: MasterDataCodeEntity | null;

  @ManyToOne(() => MasterDataCodeEntity, { eager: true, nullable: true })
  level?: MasterDataCodeEntity | null;

  @Column({
    nullable: false,
    type: String,
  })
  status: string;

  @Column({
    nullable: false,
    type: Boolean,
  })
  enrollmentOpen: boolean;

  @Column({
    nullable: false,
    type: Boolean,
  })
  hasCertificate: boolean;

  @Column({
    nullable: false,
    type: Boolean,
  })
  isFree: boolean;

  @Column({
    nullable: false,
    type: Number,
  })
  price: number;

  @Column({
    nullable: false,
    type: String,
  })
  language: string;

  @Column({
    nullable: true,
    type: String,
  })
  introVideoUrl?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  thumbnailUrl?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  fullDescription?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  shortDescription?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  title: string;

  @Column({
    nullable: false,
    type: String,
  })
  slug: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
