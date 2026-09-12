import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Certificate numbers were minted as `countByYear(year) + 1`, with no unique
 * constraint behind them — two students completing at the same moment both got
 * the same `DNA-YYYY-NNNNNN` and nothing noticed.
 *
 * A Postgres sequence hands out each value exactly once regardless of
 * concurrency, and the unique index makes a collision impossible to store even
 * if some other code path invents a number.
 *
 * The sequence is not per-year: restarting it every January would reissue
 * numbers that already exist for previous years, and the year in the string is
 * the year of issue, so a globally increasing counter keeps every number
 * unique for the life of the system.
 */
export class AddCertificateNumberSequence1786500000000 implements MigrationInterface {
  name = 'AddCertificateNumberSequence1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Any duplicates already stored have to go before the unique index can be
    // built. Keep the oldest row of each number and re-issue the rest from the
    // sequence below, so no certificate loses its identity silently.
    const duplicates: { certificateNumber: string }[] = await queryRunner.query(
      `SELECT "certificateNumber" FROM "certificate"
          GROUP BY "certificateNumber" HAVING COUNT(*) > 1`,
    );

    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "certificate_number_seq" AS bigint START WITH 1 INCREMENT BY 1`,
    );

    // Start the sequence past every number already handed out.
    await queryRunner.query(
      `SELECT setval('certificate_number_seq',
         GREATEST(
           (SELECT COALESCE(MAX(NULLIF(regexp_replace("certificateNumber", '^DNA-\\d{4}-', ''), '')::bigint), 0)
              FROM "certificate"
             WHERE "certificateNumber" ~ '^DNA-\\d{4}-\\d+$'),
           1
         ))`,
    );

    for (const { certificateNumber } of duplicates) {
      await queryRunner.query(
        `UPDATE "certificate"
            SET "certificateNumber" =
                  'DNA-' || to_char("completionDate", 'YYYY') || '-' ||
                  lpad(nextval('certificate_number_seq')::text, 6, '0')
          WHERE "certificateNumber" = $1
            AND "id" <> (
              SELECT "id" FROM "certificate"
               WHERE "certificateNumber" = $1
               ORDER BY "createdAt" ASC, "id" ASC
               LIMIT 1
            )`,
        [certificateNumber],
      );
    }

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UX_certificate_number" ON "certificate" ("certificateNumber")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UX_certificate_number"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "certificate_number_seq"`);
  }
}
