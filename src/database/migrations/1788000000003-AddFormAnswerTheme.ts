import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Form insights (PLAN-forms-insights Task B6).
 *
 * The theme an admin assigns to a free-text answer. `theme_source` is
 * `'manual' | 'ai'` so a future auto-tagging pass can share the column;
 * `themed_at` records when. `theme_code` is a master data code, deliberately
 * without a FK — the theme groups are editable content and a retired code must
 * not orphan the answers already tagged with it.
 */
export class AddFormAnswerTheme1788000000003 implements MigrationInterface {
  name = 'AddFormAnswerTheme1788000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "form_answer" ADD COLUMN "theme_code" varchar(64) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_answer" ADD COLUMN "theme_source" varchar(16) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_answer" ADD COLUMN "themed_at" timestamptz NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_form_answer_theme" ON "form_answer" ("question_id", "theme_code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_form_answer_theme"`);
    await queryRunner.query(
      `ALTER TABLE "form_answer" DROP COLUMN "themed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_answer" DROP COLUMN "theme_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_answer" DROP COLUMN "theme_code"`,
    );
  }
}
