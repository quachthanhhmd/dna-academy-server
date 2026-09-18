import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Epic 7 BE-8 — the indexes the dashboard's aggregates need.
 *
 * Every dashboard query filters `enrollment` by a date window, and two of them
 * group thousands of `career_reflection_answer` rows by their foreign keys.
 * None of those columns was indexed: Postgres indexes the *referenced* key of
 * a foreign key automatically, never the referencing column, so both
 * `career_reflection_answer` FKs were unindexed.
 *
 * The two nullable date columns get partial indexes. `completed_at` is null
 * for every enrollment that has not finished and `last_accessed_at` for every
 * one never opened, so excluding the nulls keeps the index proportional to the
 * rows the dashboard actually asks for.
 *
 * `IDX_enrollment_student_status` and `IDX_lecture_progress_enrollment_status`
 * already exist and are not duplicated here.
 */
export class AddDashboardIndexes1787400000000 implements MigrationInterface {
  name = 'AddDashboardIndexes1787400000000';

  private static readonly INDEXES: readonly [string, string][] = [
    [
      'IDX_enrollment_enrollment_date',
      `CREATE INDEX "IDX_enrollment_enrollment_date"
         ON "enrollment" ("enrollment_date")`,
    ],
    [
      'IDX_enrollment_completed_at',
      `CREATE INDEX "IDX_enrollment_completed_at"
         ON "enrollment" ("completed_at") WHERE "completed_at" IS NOT NULL`,
    ],
    [
      'IDX_enrollment_last_accessed_at',
      `CREATE INDEX "IDX_enrollment_last_accessed_at"
         ON "enrollment" ("last_accessed_at") WHERE "last_accessed_at" IS NOT NULL`,
    ],
    [
      'IDX_cra_enrollment',
      `CREATE INDEX "IDX_cra_enrollment"
         ON "career_reflection_answer" ("enrollment_id")`,
    ],
    [
      'IDX_cra_question',
      `CREATE INDEX "IDX_cra_question"
         ON "career_reflection_answer" ("question_id")`,
    ],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [, sql] of AddDashboardIndexes1787400000000.INDEXES) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [name] of [
      ...AddDashboardIndexes1787400000000.INDEXES,
    ].reverse()) {
      await queryRunner.query(`DROP INDEX "public"."${name}"`);
    }
  }
}
