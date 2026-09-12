import { CourseEntity } from '../../../../../courses/infrastructure/persistence/relational/entities/course.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { TranslationMap } from '../../../../../utils/i18n/translation-map.type';
import { CareerReflectionOption } from '../../../../career-reflection-question-types';

@Entity({
  name: 'career_reflection_question',
})
export class CareerReflectionQuestionEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: Boolean,
  })
  isActive: boolean;

  // Epic 4.1 §3.1 — 'slider' | 'radio' | 'select'. Existing rows are sliders,
  // which is what the previously hardcoded form drew.
  @Column({
    nullable: false,
    type: 'varchar',
    length: 20,
    default: 'slider',
  })
  questionType: string;

  // Slider only. The plain column holds the default locale (vi) and the
  // *Translations column holds the overrides — Epic 6 §2.3.
  @Column({ nullable: true, type: 'varchar', length: 100 })
  labelMin?: string | null;

  @Column({ nullable: true, type: 'varchar', length: 100 })
  labelMax?: string | null;

  @Column({ nullable: true, type: 'jsonb' })
  labelMinTranslations?: TranslationMap | null;

  @Column({ nullable: true, type: 'jsonb' })
  labelMaxTranslations?: TranslationMap | null;

  // radio/select only. A DB CHECK keeps this and labelMin/Max from being set
  // on the same row.
  @Column({ nullable: true, type: 'jsonb' })
  options?: CareerReflectionOption[] | null;

  @Column({
    nullable: false,
    type: Number,
  })
  displayOrder: number;

  @Column({
    nullable: false,
    type: String,
  })
  questionText: string;

  // Epic 4 v2 §2.1 — groups the post-completion form and the aggregation
  // dashboards: interest | understanding | confidence | skill_fit |
  // advanced_intention | overall_usefulness.
  @Column({
    nullable: true,
    type: String,
  })
  category?: string | null;

  @ManyToOne(() => CourseEntity, { eager: false, nullable: true })
  course?: CourseEntity | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
