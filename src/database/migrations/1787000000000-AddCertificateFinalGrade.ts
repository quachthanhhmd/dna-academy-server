import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Epic 4.5 §1.5 (revised) — the final grade is frozen onto the certificate.
 *
 * It used to be `MAX(quiz_attempt.score)` computed live on every read, so a
 * student who retook a quiz after finishing the course saw the grade beside
 * their certificate change while the certificate itself stood still. The
 * certificate is a frozen record; its grade has to be frozen with it.
 *
 * Only the percentage is stored. The letter is a pure function of it
 * (`gradeLabelFor`), and storing both is how the two end up disagreeing.
 *
 * **Backfill.** Certificates issued before this migration have no stored
 * grade, so it is computed once here from the attempts that exist right now —
 * the closest thing available to what the grade was at issue time. A
 * certificate whose student never submitted a quiz stays NULL, which the API
 * already renders as "no grade row" rather than 0%.
 */
export class AddCertificateFinalGrade1787000000000 implements MigrationInterface {
  name = 'AddCertificateFinalGrade1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificate" ADD "finalGradePct" smallint`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate" ADD CONSTRAINT "CK_certificate_grade_0_100"
         CHECK ("finalGradePct" IS NULL
                OR "finalGradePct" BETWEEN 0 AND 100)`,
    );

    await queryRunner.query(
      `UPDATE "certificate" c
          SET "finalGradePct" = best.score
         FROM (
           SELECT a."enrollmentId", MAX(a."score") AS score
             FROM "quiz_attempt" a
            WHERE a."submittedAt" IS NOT NULL AND a."score" IS NOT NULL
            GROUP BY a."enrollmentId"
         ) AS best
        WHERE best."enrollmentId" = c."enrollmentId"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "certificate" DROP CONSTRAINT "CK_certificate_grade_0_100"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certificate" DROP COLUMN "finalGradePct"`,
    );
  }
}
