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
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

@Entity({ name: 'form_submission_event' })
export class FormSubmissionEventEntity extends EntityRelationalHelper {
  @ManyToOne(() => FormSubmissionEntity, { nullable: false })
  @JoinColumn({ name: 'submission_id' })
  submission: FormSubmissionEntity;
  @Column({
    name: 'event',
    nullable: false,
    type: String,
  })
  event: string;
  @Column({
    name: 'from_status',
    nullable: true,
    type: String,
  })
  fromStatus: string | null;
  @Column({
    name: 'to_status',
    nullable: true,
    type: String,
  })
  toStatus: string | null;
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser: UserEntity;
  @Column({
    name: 'payload',
    type: 'jsonb',
    nullable: true,
  })
  payload: Record<string, unknown> | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
