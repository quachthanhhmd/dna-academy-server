import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { RoleEntity } from '../../../../../roles/infrastructure/persistence/relational/entities/role.entity';
import { StatusEntity } from '../../../../../statuses/infrastructure/persistence/relational/entities/status.entity';
import { FileEntity } from '../../../../../files/infrastructure/persistence/relational/entities/file.entity';

import { AuthProvidersEnum } from '../../../../../auth/auth-providers.enum';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { DEFAULT_LOCALE } from '../../../../../utils/i18n/locale';

@Entity({
  name: 'user',
})
export class UserEntity extends EntityRelationalHelper {
  // Epic 6: preferred UI locale. Defaults to the platform default (vi) so
  // every pre-existing row is valid without a backfill of its own.
  @Column({
    nullable: false,
    type: String,
    default: DEFAULT_LOCALE,
  })
  locale: string;

  @Column({
    nullable: false,
    type: Boolean,
    default: false,
  })
  onboardingDone: boolean;

  @Column({
    nullable: true,
    type: Number,
  })
  age?: number | null;

  @Column({
    nullable: true,
    type: Date,
  })
  dateOfBirth?: Date | null;

  @Column({
    nullable: true,
    type: String,
  })
  profilePictureUrl?: string | null;

  @Column({
    nullable: false,
    type: Boolean,
    default: false,
  })
  emailVerified: boolean;

  @Column({
    nullable: false,
    type: String,
  })
  fullName: string;

  @PrimaryGeneratedColumn()
  id: number;

  // For "string | null" we need to use String type.
  // More info: https://github.com/typeorm/typeorm/issues/2567
  @Column({ type: String, unique: true, nullable: true })
  email: string | null;

  @Column({ nullable: true })
  password?: string;

  @Column({ default: AuthProvidersEnum.email })
  provider: string;

  @Index()
  @Column({ type: String, nullable: true })
  socialId?: string | null;

  @Index()
  @Column({ type: String, nullable: true })
  firstName: string | null;

  @Index()
  @Column({ type: String, nullable: true })
  lastName: string | null;

  @OneToOne(() => FileEntity, {
    eager: true,
  })
  @JoinColumn()
  photo?: FileEntity | null;

  @ManyToOne(() => RoleEntity, {
    eager: true,
  })
  role?: RoleEntity | null;

  @ManyToOne(() => StatusEntity, {
    eager: true,
  })
  status?: StatusEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
