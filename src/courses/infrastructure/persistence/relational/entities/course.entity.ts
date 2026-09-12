import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import { MasterDataCodeEntity } from '../../../../../master-data-codes/infrastructure/persistence/relational/entities/master-data-code.entity';

import {
  Check,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { IndexOptions } from 'typeorm/decorator/options/IndexOptions';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { COURSE_SEARCH_VECTOR_EXPRESSION } from '../course-search.sql';

/**
 * "This index exists; leave it alone."
 *
 * `@Index` reads `synchronize` off its options at runtime
 * (`IndexMetadataArgs.synchronize`), but the exported `IndexOptions` type does
 * not declare it — hence the assertion rather than a plain object literal.
 */
const MIGRATION_OWNED_INDEX = { synchronize: false } as unknown as IndexOptions;

// Plain btree: Postgres scans it backwards for ORDER BY publishedAt DESC.
@Index('IDX_course_status_published_at', ['status', 'publishedAt'])
// Epic 4.4 §1.5 — the GIN index behind the catalog search, owned by the
// migration. `synchronize: false` is not cosmetic: TypeORM has no way to
// express GIN, so an index it does not know about is one it drops and
// recreates as a btree on the next `migration:generate` — and a btree answers
// `@@` by scanning the whole table.
@Index('IDX_course_search_vector', ['searchVector'], MIGRATION_OWNED_INDEX)
@Check(
  'CK_course_avg_rating_0_5',
  `"avgRating" IS NULL OR "avgRating" BETWEEN 0 AND 5`,
)
@Entity({
  name: 'course',
})
export class CourseEntity extends EntityRelationalHelper {
  // Client-supplied business code (e.g. "DNA-101"), distinct from the UUID
  // primary key. Nullable at the DB level so pre-existing rows survive the
  // migration and so Postgres keeps allowing multiple NULLs under the unique
  // index; the admin create endpoint requires it.
  @Index('IDX_course_courseId_unique', { unique: true })
  @Column({
    nullable: true,
    type: String,
  })
  courseId?: string | null;

  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  createdBy?: UserEntity | null;

  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  publishedBy?: UserEntity | null;

  @Column({
    nullable: true,
    type: Date,
  })
  publishedAt?: Date | null;

  // Epic 4 v2 §2.1 — publish audit trail.
  @Column({
    nullable: true,
    type: Date,
  })
  unpublishedAt?: Date | null;

  @ManyToOne(() => UserEntity, { eager: false, nullable: true })
  unpublishedBy?: UserEntity | null;

  // Epic 4 v2 §2.4 — when true, a lecture only opens once the previous
  // required lecture in the course is completed.
  @Column({
    nullable: false,
    type: Boolean,
    default: false,
  })
  requiresSequentialCompletion: boolean;

  // Epic 4 v2 §2.1: widened from integer so a 4.75 average survives a
  // round-trip. Postgres returns numeric as a string; the transformer keeps
  // the domain model on plain numbers.
  @Column({
    nullable: true,
    type: 'numeric',
    precision: 3,
    scale: 2,
    transformer: {
      to: (value?: number | null) => value ?? null,
      from: (value: string | null) => (value === null ? null : Number(value)),
    },
  })
  avgRating?: number | null;

  @Column({
    nullable: false,
    type: Number,
  })
  totalEnrollments?: number;

  @Column({
    nullable: false,
    type: Number,
  })
  totalDurationSecs?: number;

  @Column({
    nullable: false,
    type: Number,
  })
  totalLectures?: number;

  @Column({
    nullable: false,
    type: Number,
  })
  totalSections?: number;

  @ManyToOne(() => MasterDataCodeEntity, { eager: true, nullable: true })
  category?: MasterDataCodeEntity | null;

  @ManyToOne(() => MasterDataCodeEntity, { eager: true, nullable: true })
  level?: MasterDataCodeEntity | null;

  @Column({
    nullable: false,
    type: String,
  })
  status: string;

  @Column({
    nullable: false,
    type: Boolean,
  })
  enrollmentOpen: boolean;

  @Column({
    nullable: false,
    type: Boolean,
  })
  hasCertificate: boolean;

  @Column({
    nullable: false,
    type: Boolean,
  })
  isFree: boolean;

  @Column({
    nullable: false,
    type: Number,
  })
  price: number;

  @Column({
    nullable: false,
    type: String,
  })
  language: string;

  @Column({
    nullable: true,
    type: String,
  })
  introVideoUrl?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  thumbnailUrl?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  fullDescription?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  shortDescription?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  title: string;

  @Column({
    nullable: false,
    type: String,
  })
  slug: string;

  /**
   * Epic 4.4 §1.5 — the catalog's full-text search vector.
   *
   * Postgres owns this column entirely: it is `GENERATED ALWAYS AS ... STORED`
   * over title/shortDescription/fullDescription through the `vi_unaccent`
   * configuration, so it can never drift from the row and there is no trigger
   * to forget. It is declared here only so TypeORM knows the column exists —
   * `insert`/`update` are off because writing to a generated column is an
   * error Postgres raises at runtime and no unit test would ever see, and
   * `select: false` keeps a tsvector off every course read that does not
   * want it.
   *
   * `asExpression` must stay byte-identical to the row the migration wrote
   * into `typeorm_metadata`: TypeORM reads the expression back from *there*,
   * not from Postgres, and compares it to this string character for character.
   * A mismatch makes every `migration:generate` emit a drop-and-recreate of
   * this column and its GIN index. Both sides share one frozen constant, and
   * `course-search.sql.spec.ts` pins its text.
   */
  @Column({
    type: 'tsvector',
    nullable: true,
    select: false,
    generatedType: 'STORED',
    asExpression: COURSE_SEARCH_VECTOR_EXPRESSION,
  })
  searchVector?: string | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
