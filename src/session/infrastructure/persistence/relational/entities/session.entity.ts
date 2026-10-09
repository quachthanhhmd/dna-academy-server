import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

/**
 * Hard-deleted on purpose — no `@DeleteDateColumn` here.
 *
 * A session is the shortest-lived row in the schema: one per sign-in, gone on
 * logout, on a password change, on an admin switching an account off, and on
 * refresh-token replay. Keeping the dead ones carried a cost and bought
 * nothing. Before this change 85% of the table was tombstones, and the
 * `user_id` index does not include `deleted_at`, so every lookup walked the
 * dead rows to discard them.
 *
 * There is no audit argument for keeping them either: a tombstone records
 * that *a* session ended, not who used it or from where. Anything worth
 * auditing about sign-ins belongs in its own append-only table, not in the
 * row the auth path reads on every token refresh.
 */
@Entity({
  name: 'session',
})
export class SessionEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, {
    eager: true,
  })
  @JoinColumn({ name: 'user_id' })
  @Index()
  user: UserEntity;

  @Column({ name: 'hash' })
  hash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
