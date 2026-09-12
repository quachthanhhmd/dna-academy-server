import { LectureEntity } from '../../../../../lectures/infrastructure/persistence/relational/entities/lecture.entity';

import {
  Check,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Check('CK_quiz_passing_score_0_100', `"passing_score" BETWEEN 0 AND 100`)
@Check(
  'CK_quiz_pass_threshold_0_100',
  `"pass_threshold_percent" BETWEEN 0 AND 100`,
)
@Entity({
  name: 'lecture_content_quiz',
})
export class LectureContentQuizEntity extends EntityRelationalHelper {
  @Column({
    name: 'allow_resume',
    nullable: false,
    type: Boolean,
  })
  allowResume: boolean;

  @Column({
    name: 'passing_score',
    nullable: false,
    type: Number,
  })
  passingScore: number;

  // Epic 4 v2.1 §2.1 — the threshold v2.1 grading actually reads. The DB
  // default is a fixed 70 so the migration is deterministic; the application
  // overrides it from QUIZ_PASS_THRESHOLD_DEFAULT when creating a row.
  @Column({
    name: 'pass_threshold_percent',
    nullable: false,
    type: 'smallint',
    default: 70,
  })
  passThresholdPercent: number;

  // Epic 4 v2 §2.1 — NULL means the quiz is untimed and the FE hides the timer.
  @Column({
    name: 'time_limit_secs',
    nullable: true,
    type: Number,
  })
  timeLimitSecs?: number | null;

  @Column({
    name: 'instructions',
    nullable: true,
    type: String,
  })
  instructions?: string | null;

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
