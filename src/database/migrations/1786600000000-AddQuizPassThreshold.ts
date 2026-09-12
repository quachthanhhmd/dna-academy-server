import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Epic 4 v2.1 §2.1 — `lecture_content_quiz.pass_threshold_percent`.
 *
 * `passingScore` stays where it is: historical `quiz_attempts` were judged
 * against it and rewriting that would rewrite the past. New grading reads
 * only the new column.
 *
 * The DB default is a fixed 70 so the migration is deterministic regardless
 * of the environment it runs in — the env override applies when the
 * application creates a row, not here. Existing rows are backfilled from
 * their own `passingScore` rather than the default, because a quiz that
 * required 80% before this migration must still require 80% after it.
 */
export class AddQuizPassThreshold1786600000000 implements MigrationInterface {
  name = 'AddQuizPassThreshold1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lecture_content_quiz" ADD "passThresholdPercent" smallint NOT NULL DEFAULT 70`,
    );
    await queryRunner.query(
      `UPDATE "lecture_content_quiz" SET "passThresholdPercent" = LEAST(100, GREATEST(0, "passingScore"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_quiz" ADD CONSTRAINT "CK_quiz_pass_threshold_0_100" CHECK ("passThresholdPercent" BETWEEN 0 AND 100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lecture_content_quiz" DROP CONSTRAINT "CK_quiz_pass_threshold_0_100"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_quiz" DROP COLUMN "passThresholdPercent"`,
    );
  }
}
