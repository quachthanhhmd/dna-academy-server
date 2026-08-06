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
  name: 'lecture_content_video',
})
export class LectureContentVideoEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: String,
  })
  youtubeVideoId?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  youtubeUrl: string;

  @OneToOne(() => LectureEntity, { eager: true, nullable: false })
  @JoinColumn()
  lecture: LectureEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
