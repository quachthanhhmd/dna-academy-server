import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One registry for stored files: `media_file`.
 *
 * Uploads used to land in `file` (`id`, `path`) while quiz submissions and
 * certificates referenced `media_file`, so the quiz upload wrote both and
 * nothing could tell which bucket or visibility a `file` row had. From here
 * on every upload writes one `media_file` row that records where the bytes
 * are (`bucket`) and who may read them (`visibility`), and `user.photo_id`
 * points at it.
 *
 * `file` rows are copied across with their ids, so every existing
 * `user.photo_id` stays valid. Their bucket is not known to the database, so
 * it is inferred from the stored path:
 *   - an absolute URL (an OAuth avatar) → `external`
 *   - `/…` (the local driver's download route) → `local`
 *   - anything else is an object key → `legacy`, which resolves against the
 *     bucket the driver is configured with (`R2_BUCKET`), as it always did
 * They were all served publicly before, so they stay `public`.
 *
 * Rows already in `media_file` are quiz submissions and certificate files:
 * they become `private`. Their `bucket` holds the driver name the quiz upload
 * wrote (`r2`, `local`, ...), which the application reads as `legacy`.
 *
 * The `file` table itself is left in place, unused, so this release can be
 * rolled back; a later migration drops it.
 */
export class MergeFileIntoMediaFile1788000000000 implements MigrationInterface {
  name = 'MergeFileIntoMediaFile1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "media_file" ADD "visibility" character varying NOT NULL DEFAULT 'private'`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_file" ADD "purpose" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_file" ADD CONSTRAINT "CK_media_file_visibility" CHECK ("visibility" IN ('public', 'private'))`,
    );

    // Quiz submissions are the only media_file rows written by an upload.
    await queryRunner.query(
      `UPDATE "media_file" SET "purpose" = 'quiz-submission'
        WHERE "id" IN (SELECT "file_id" FROM "quiz_attempt_answer" WHERE "file_id" IS NOT NULL)`,
    );

    await queryRunner.query(
      `INSERT INTO "media_file" ("id", "status", "object_key", "bucket", "visibility", "purpose")
       SELECT "id",
              'ready',
              "path",
              CASE
                WHEN "path" ~* '^https?://' THEN 'external'
                WHEN "path" LIKE '/%' THEN 'local'
                ELSE 'legacy'
              END,
              'public',
              'upload'
         FROM "file"
       ON CONFLICT ("id") DO NOTHING`,
    );

    // Re-point the photo FK. Look it up rather than hard-coding its name:
    // it was created as FK_75e2be… and renamed along with the column.
    await queryRunner.query(`
      DO $$
      DECLARE fk text;
      BEGIN
        FOR fk IN
          SELECT c.conname FROM pg_constraint c
            JOIN pg_attribute a
              ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
           WHERE c.conrelid = '"user"'::regclass
             AND c.contype = 'f'
             AND a.attname = 'photo_id'
        LOOP
          EXECUTE format('ALTER TABLE "user" DROP CONSTRAINT %I', fk);
        END LOOP;
      END $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_2863d588f4efce8bf42c9c63526" FOREIGN KEY ("photo_id") REFERENCES "media_file"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_2863d588f4efce8bf42c9c63526"`,
    );

    // Rows that were in media_file before `up` have no purpose, or are quiz
    // submissions; they belong there and are left alone. Everything else —
    // the copies of `file` and uploads made since — goes (back) to `file`, so
    // the photo FK can point at it again.
    const movable = `"purpose" IS NOT NULL AND "purpose" <> 'quiz-submission'`;

    await queryRunner.query(
      `INSERT INTO "file" ("id", "path")
       SELECT "id", "object_key" FROM "media_file"
        WHERE ${movable}
          AND "id" NOT IN (SELECT "id" FROM "file")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_2863d588f4efce8bf42c9c63526" FOREIGN KEY ("photo_id") REFERENCES "file"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`DELETE FROM "media_file" WHERE ${movable}`);
    await queryRunner.query(
      `ALTER TABLE "media_file" DROP CONSTRAINT "CK_media_file_visibility"`,
    );
    await queryRunner.query(`ALTER TABLE "media_file" DROP COLUMN "purpose"`);
    await queryRunner.query(
      `ALTER TABLE "media_file" DROP COLUMN "visibility"`,
    );
  }
}
