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
    name: 'locale',
    nullable: false,
    type: String,
    default: DEFAULT_LOCALE,
  })
  locale: string;

  @Column({
    name: 'onboarding_done',
    nullable: false,
    type: Boolean,
    default: false,
  })
  onboardingDone: boolean;

  @Column({
    name: 'age',
    nullable: true,
    type: Number,
  })
  age?: number | null;

  @Column({
    name: 'date_of_birth',
    nullable: true,
    type: 'date',
  })
  dateOfBirth?: Date | null;

  @Column({
    name: 'profile_picture_url',
    nullable: true,
    type: String,
  })
  profilePictureUrl?: string | null;

  @Column({
    name: 'email_verified',
    nullable: false,
    type: Boolean,
    default: false,
  })
  emailVerified: boolean;

  @Column({
    name: 'full_name',
    nullable: false,
    type: String,
  })
  fullName: string;

  @PrimaryGeneratedColumn()
  id: number;

  // For "string | null" we need to use String type.
  // More info: https://github.com/typeorm/typeorm/issues/2567
  @Column({ name: 'email', type: String, unique: true, nullable: true })
  email: string | null;

  @Column({ name: 'password', type: String, nullable: true })
  password?: string | null;

  @Column({ name: 'provider', default: AuthProvidersEnum.email })
  provider: string;

  @Index()
  @Column({ name: 'social_id', type: String, nullable: true })
  socialId?: string | null;

  @Index()
  @Column({ name: 'first_name', type: String, nullable: true })
  firstName: string | null;

  @Index()
  @Column({ name: 'last_name', type: String, nullable: true })
  lastName: string | null;

  @OneToOne(() => FileEntity, {
    eager: true,
  })
  @JoinColumn({ name: 'photo_id' })
  photo?: FileEntity | null;

  @ManyToOne(() => RoleEntity, {
    eager: true,
  })
  @JoinColumn({ name: 'role_id' })
  role?: RoleEntity | null;

  @ManyToOne(() => StatusEntity, {
    eager: true,
  })
  @JoinColumn({ name: 'status_id' })
  status?: StatusEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;
}
