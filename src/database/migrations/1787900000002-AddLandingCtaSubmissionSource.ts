import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * EPIC-09 — widen the submission `source` allowlist with `landing_cta`.
 *
 * The landing page has two entry points into the instructor application: the
 * carousel's first slide posts `landing`, and the Ready CTA band posts
 * `landing_cta`, so the submissions list can tell them apart. The DTO's
 * `SOURCES` and the original `CHK_form_submission_source` constraint both
 * predate that, and the constraint is the one that actually rejects the write —
 * without this migration the API accepts the DTO and Postgres raises a
 * constraint violation, which surfaces as a 500.
 */
export class AddLandingCtaSubmissionSource1787900000002 implements MigrationInterface {
  name = 'AddLandingCtaSubmissionSource1787900000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "form_submission" DROP CONSTRAINT "CHK_form_submission_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_submission" ADD CONSTRAINT "CHK_form_submission_source" CHECK ("source" IN
        ('landing','landing_cta','certificate','catalog','other'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "form_submission" DROP CONSTRAINT "CHK_form_submission_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_submission" ADD CONSTRAINT "CHK_form_submission_source" CHECK ("source" IN
        ('landing','certificate','catalog','other'))`,
    );
  }
}
