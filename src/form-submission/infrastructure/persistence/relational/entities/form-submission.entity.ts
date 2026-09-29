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
import { CourseEntity } from '../../../../../courses/infrastructure/persistence/relational/entities/course.entity';
import { FormDefinitionEntity } from '../../../../../form-definition/infrastructure/persistence/relational/entities/form-definition.entity';
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

@Entity({ name: 'form_submission' })
export class FormSubmissionEntity extends EntityRelationalHelper {
  @ManyToOne(() => FormDefinitionEntity, { nullable: false })
  @JoinColumn({ name: 'form_definition_id' })
  formDefinition: FormDefinitionEntity;
  @Column({
    name: 'form_version',
    nullable: false,
    type: Number,
  })
  formVersion: number;
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
  @Column({
    name: 'full_name',
    nullable: false,
    type: String,
  })
  fullName: string;
  @Column({
    name: 'email',
    nullable: false,
    type: String,
  })
  email: string;
  @Column({
    name: 'email_normalized',
    nullable: false,
    type: String,
  })
  emailNormalized: string;
  @Column({
    name: 'phone',
    nullable: true,
    type: String,
  })
  phone: string | null;
  @Column({
    name: 'primary_field_code',
    nullable: true,
    type: String,
  })
  primaryFieldCode: string | null;
  @ManyToOne(() => CourseEntity, { nullable: true })
  @JoinColumn({ name: 'selected_course_id' })
  selectedCourse: CourseEntity;
  @Column({
    name: 'status',
    nullable: false,
    type: String,
  })
  status: string;
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignedToUser: UserEntity;
  @Column({
    name: 'internal_notes',
    nullable: true,
    type: String,
  })
  internalNotes: string | null;
  @Column({
    name: 'is_latest',
    type: Boolean,
    nullable: false,
  })
  isLatest: boolean;
  @ManyToOne(() => FormSubmissionEntity, { nullable: true })
  @JoinColumn({ name: 'superseded_by_id' })
  supersededBy: FormSubmissionEntity;
  @Column({
    name: 'source',
    nullable: false,
    type: String,
  })
  source: string;
  @Column({
    name: 'locale',
    nullable: false,
    type: String,
  })
  locale: string;
  @Column({
    name: 'utm',
    type: 'jsonb',
    nullable: true,
  })
  utm: Record<string, unknown> | null;
  @Column({
    name: 'ip_hash',
    nullable: true,
    type: String,
  })
  ipHash: string | null;
  @Column({
    name: 'ip_hash_day',
    type: 'date',
    nullable: true,
  })
  ipHashDay: string | null;
  @Column({
    name: 'user_agent',
    nullable: true,
    type: String,
  })
  userAgent: string | null;
  @Column({
    name: 'is_suspicious',
    type: Boolean,
    nullable: false,
  })
  isSuspicious: boolean;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
