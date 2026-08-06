import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'oauth_account',
})
export class OauthAccountEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: Date,
  })
  tokenExpiresAt?: Date | null;

  @Column({
    nullable: true,
    type: String,
  })
  refreshToken?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  accessToken?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  providerUid: string;

  @Column({
    nullable: false,
    type: String,
  })
  provider: string;

  @ManyToOne(() => UserEntity, { eager: true, nullable: false })
  user: UserEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
