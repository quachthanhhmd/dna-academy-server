import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Form insights (PLAN-forms-insights Task B1, step 4).
 *
 * `form_answer` has indexes on `submission_id` and on
 * `(submission_id, question_id)`, but none whose leading column is
 * `question_id`. The per-question analytics joins
 * `form_answer a JOIN form_question q ON q.id = a.question_id` and groups by
 * the question, so that join has nothing to seek on and falls back to a
 * sequential scan. Every other index the plan listed already exists in
 * `AddFormsSchema`; this is the only one missing.
 */
export class AddFormAnalyticsIndexes1788000000002 implements MigrationInterface {
  name = 'AddFormAnalyticsIndexes1788000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_form_answer_question" ON "form_answer" ("question_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_form_answer_question"`);
  }
}
