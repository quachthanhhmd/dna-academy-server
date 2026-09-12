import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

// Postgres `numeric` comes back from the driver as a string; the column is
// declared numeric(3,2) so 4.75 survives a round-trip, and this transformer
// keeps the domain model on plain numbers.
const numericTransformer = {
  to: (value?: number | null) => value ?? null,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Index('IDX_instructor_isActive_displayOrder', ['isActive', 'displayOrder'])
@Entity({
  name: 'instructor',
})
export class InstructorEntity extends EntityRelationalHelper {
  // OneToOne (not ManyToOne) so Postgres enforces "one user ↔ one instructor"
  // with a unique index; the service still checks first so the caller gets a
  // 409 user_already_linked instead of a driver error.
  @OneToOne(() => UserEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity | null;

  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: UserEntity | null;

  @Index('IDX_instructor_slug_unique', { unique: true })
  @Column({
    name: 'slug',
    nullable: false,
    type: String,
  })
  slug: string;

  @Column({
    name: 'full_name',
    nullable: false,
    type: String,
  })
  fullName: string;

  @Column({
    name: 'headline',
    nullable: true,
    type: String,
  })
  headline?: string | null;

  @Column({
    name: 'bio',
    nullable: true,
    type: 'text',
  })
  bio?: string | null;

  @Column({
    name: 'profile_picture_url',
    nullable: true,
    type: String,
  })
  profilePictureUrl?: string | null;

  @Column({
    name: 'email_public',
    nullable: true,
    type: String,
  })
  emailPublic?: string | null;

  @Column({
    name: 'years_of_experience',
    nullable: true,
    type: Number,
  })
  yearsOfExperience?: number | null;

  @Column({
    name: 'is_active',
    nullable: false,
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  @Column({
    name: 'display_order',
    nullable: false,
    type: Number,
    default: 0,
  })
  displayOrder: number;

  @Column({
    name: 'total_courses',
    nullable: false,
    type: Number,
    default: 0,
  })
  totalCourses: number;

  @Column({
    name: 'total_students',
    nullable: false,
    type: Number,
    default: 0,
  })
  totalStudents: number;

  @Column({
    name: 'avg_rating',
    nullable: true,
    type: 'numeric',
    precision: 3,
    scale: 2,
    transformer: numericTransformer,
  })
  avgRating?: number | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
