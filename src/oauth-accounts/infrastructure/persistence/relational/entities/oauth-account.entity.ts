import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import {
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  JoinColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

// One account per provider identity. Social login resolves (provider, uid) to
// a user, so a second row for the same identity would make that answer depend
// on row order.
@Index('UX_oauth_account_identity', ['provider', 'providerUid'], {
  unique: true,
})
// Listing an account's links (GET /auth/me/social-links).
@Index('IDX_oauth_account_user', ['user'])
@Entity({
  name: 'oauth_account',
})
export class OauthAccountEntity extends EntityRelationalHelper {
  @Column({
    name: 'token_expires_at',
    nullable: true,
    type: 'timestamptz',
  })
  tokenExpiresAt?: Date | null;

  @Column({
    name: 'refresh_token',
    nullable: true,
    type: String,
  })
  refreshToken?: string | null;

  @Column({
    name: 'access_token',
    nullable: true,
    type: String,
  })
  accessToken?: string | null;

  @Column({
    name: 'provider_uid',
    nullable: false,
    type: String,
  })
  providerUid: string;

  @Column({
    name: 'provider',
    nullable: false,
    type: String,
  })
  provider: string;

  @ManyToOne(() => UserEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
