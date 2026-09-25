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
import { FormSubmissionEntity } from '../../../../../form-submission/infrastructure/persistence/relational/entities/form-submission.entity';

@Entity({ name: 'form_submission_consent' })
export class FormSubmissionConsentEntity extends EntityRelationalHelper {
  @ManyToOne(() => FormSubmissionEntity, { nullable: false })
  @JoinColumn({ name: 'submission_id' })
  submission: FormSubmissionEntity;
  @Column({
    name: 'consent_code',
    nullable: false,
    type: String,
  })
  consentCode: string;
  @Column({
    name: 'version',
    nullable: false,
    type: String,
  })
  version: string;
  @Column({
    name: 'accepted_at',
    type: 'timestamptz',
    nullable: false,
  })
  acceptedAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
