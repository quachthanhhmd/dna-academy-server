import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Course thumbnails and lecture documents can point at the uploaded file they
 * come from, instead of only holding a URL string.
 *
 * - `course.thumbnail_file_id`: set alongside `thumbnail_url`, which stays the
 *   column every reader uses — a thumbnail is public, so its URL is stable.
 * - `lecture_content_document.file_id`: replaces `file_url` for uploaded
 *   documents. They are private, so there is no URL worth storing; one is
 *   presigned on every read. `file_url` becomes nullable and is kept for the
 *   documents saved as bare URLs before this.
 *
 * Both columns are additive and nullable; existing rows are untouched.
 */
export class LinkThumbnailAndDocumentFiles1788000000001 implements MigrationInterface {
  name = 'LinkThumbnailAndDocumentFiles1788000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course" ADD "thumbnail_file_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" ADD CONSTRAINT "FK_f52f2d6eb9220c133a9df4ae11f" FOREIGN KEY ("thumbnail_file_id") REFERENCES "media_file"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "lecture_content_document" ADD "file_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_document" ADD CONSTRAINT "FK_79edfdca6aca91c4270c9689f1a" FOREIGN KEY ("file_id") REFERENCES "media_file"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_document" ALTER COLUMN "file_url" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Documents saved as uploaded files have no URL to fall back to. Leaving
    // them would fail SET NOT NULL, and an empty URL is a broken lecture
    // either way, so a rollback past this point needs them re-saved first.
    const [{ count }] = await queryRunner.query(
      `SELECT COUNT(*)::int AS count FROM "lecture_content_document" WHERE "file_url" IS NULL`,
    );
    if (count > 0) {
      throw new Error(
        `${count} lecture document(s) exist only as uploaded files (file_url IS NULL). ` +
          'Re-save them with a fileUrl before reverting this migration.',
      );
    }

    await queryRunner.query(
      `ALTER TABLE "lecture_content_document" ALTER COLUMN "file_url" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_document" DROP CONSTRAINT "FK_79edfdca6aca91c4270c9689f1a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_document" DROP COLUMN "file_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "course" DROP CONSTRAINT "FK_f52f2d6eb9220c133a9df4ae11f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" DROP COLUMN "thumbnail_file_id"`,
    );
  }
}
