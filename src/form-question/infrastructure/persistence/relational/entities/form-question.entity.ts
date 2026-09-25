import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { FormDefinitionEntity } from '../../../../../form-definition/infrastructure/persistence/relational/entities/form-definition.entity';

@Entity({ name: 'form_question' })
export class FormQuestionEntity extends EntityRelationalHelper {
  @ManyToOne(() => FormDefinitionEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'form_definition_id' })
  formDefinition: FormDefinitionEntity;
  @Column({
    name: 'code',
    nullable: false,
    type: String,
  })
  code: string;
  @Column({
    name: 'section_code',
    nullable: false,
    type: String,
  })
  sectionCode: string;
  @Column({
    name: 'question_type',
    nullable: false,
    type: String,
  })
  questionType: string;
  @Column({
    name: 'master_data_group_key',
    nullable: true,
    type: String,
  })
  masterDataGroupKey: string | null;
  @Column({
    name: 'is_required',
    type: Boolean,
    nullable: false,
  })
  isRequired: boolean;
  @Column({
    name: 'display_order',
    nullable: false,
    type: Number,
  })
  displayOrder: number;
  @Column({
    name: 'label_translations',
    type: 'jsonb',
    nullable: false,
  })
  labelTranslations: Record<string, string>;
  @Column({
    name: 'placeholder_translations',
    type: 'jsonb',
    nullable: true,
  })
  placeholderTranslations: Record<string, string> | null;
  @Column({
    name: 'helper_translations',
    type: 'jsonb',
    nullable: true,
  })
  helperTranslations: Record<string, string> | null;
  @Column({
    name: 'min_length',
    nullable: true,
    type: Number,
  })
  minLength: number | null;
  @Column({
    name: 'max_length',
    nullable: true,
    type: Number,
  })
  maxLength: number | null;
  @Column({
    name: 'allow_other',
    type: Boolean,
    nullable: false,
  })
  allowOther: boolean;
  @Column({
    name: 'consent_code',
    nullable: true,
    type: String,
  })
  consentCode: string | null;
  @ManyToOne(() => FormQuestionEntity, { nullable: true })
  @JoinColumn({ name: 'parent_question_id' })
  parentQuestion: FormQuestionEntity;
  @Column({
    name: 'parent_option_code',
    nullable: true,
    type: String,
  })
  parentOptionCode: string | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
