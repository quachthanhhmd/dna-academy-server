import { CourseEntity } from '../../../../../courses/infrastructure/persistence/relational/entities/course.entity';

import {
  Check,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  JoinColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { TranslationMap } from '../../../../../utils/i18n/translation-map.type';
import { CareerReflectionOption } from '../../../../career-reflection-question-types';

@Check('CK_crq_question_type', `"question_type" IN ('free_text', 'selection')`)
@Check(
  'CK_crq_shape',
  `("question_type" = 'free_text' AND "options" IS NULL)
   OR ("question_type" = 'selection' AND "options" IS NOT NULL
       AND jsonb_typeof("options") = 'array'
       AND jsonb_array_length("options") BETWEEN 2 AND 7)`,
)
@Entity({
  name: 'career_reflection_question',
})
export class CareerReflectionQuestionEntity extends EntityRelationalHelper {
  @Column({
    name: 'is_active',
    nullable: false,
    type: Boolean,
  })
  isActive: boolean;

  // Epic 4.6 §2.1 — 'free_text' | 'selection'. No default: the two types
  // need different shapes, so there is no value that is safe to assume.
  @Column({
    name: 'question_type',
    nullable: false,
    type: 'varchar',
    length: 20,
  })
  questionType: string;

  // selection only; `CK_crq_shape` keeps it null on a free_text row. Each
  // option carries its own `labelTranslations` (Epic 6 §2.3), so a label and
  // its translations can never drift apart the way two parallel arrays would.
  @Column({ name: 'options', nullable: true, type: 'jsonb' })
  options?: CareerReflectionOption[] | null;

  // Epic 4.6 §1 — every question on the reworked form is required, but the
  // flag stays per row so an admin can add an optional one later.
  @Column({
    name: 'is_required',
    nullable: false,
    type: Boolean,
    default: true,
  })
  isRequired: boolean;

  @Column({
    name: 'display_order',
    nullable: false,
    type: Number,
  })
  displayOrder: number;

  @Column({
    name: 'question_text',
    nullable: false,
    type: String,
  })
  questionText: string;

  // Epic 4.6 §2.2 — until now only option labels could be translated, so an
  // English learner saw English choices under a Vietnamese question.
  @Column({ name: 'question_text_translations', nullable: true, type: 'jsonb' })
  questionTextTranslations?: TranslationMap | null;

  // Epic 4.6 D6 — retained but unused. It grouped Epic 4.1's Likert form and
  // the old radar chart; the reworked form is a flat list and the dashboard
  // counts per option instead.
  @Column({
    name: 'category',
    nullable: true,
    type: String,
  })
  category?: string | null;

  @ManyToOne(() => CourseEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'course_id' })
  course?: CourseEntity | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
