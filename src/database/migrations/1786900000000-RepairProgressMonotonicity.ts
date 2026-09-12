import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Epic 4.2 §2.5 — repairs the rows the non-monotonic progress path corrupted.
 *
 * The code fix (monotonic status, completion never withdrawn, `completedAt`
 * stamped once) stops new damage. This repairs what already happened: on the
 * dev database a student had finished a course, reopened the last lecture, and
 * lost the certificate they had earned.
 *
 * **Forward-only.** `down()` is deliberately a no-op: the "before" state is
 * corrupt by definition — a lecture with a completion date that reads
 * unfinished, an enrollment holding a certificate it is not allowed to see —
 * and there is no version of it worth restoring. Reverting the migration
 * reverts the schema, not the truth about who finished what.
 *
 * `progressPct` is not repaired here. It is recomputed on the next progress
 * write, and once completion cannot be withdrawn a stale percentage on a
 * finished enrollment is cosmetic.
 */
export class RepairProgressMonotonicity1786900000000 implements MigrationInterface {
  name = 'RepairProgressMonotonicity1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // BUG-03 — a row that recorded a completion date but reads unfinished.
    // The date is the evidence: it is only ever written on a completion.
    await queryRunner.query(
      `UPDATE "lecture_progress"
          SET "status" = 'completed'
        WHERE "completedAt" IS NOT NULL AND "status" <> 'completed'`,
    );

    // BUG-01 — an enrollment holding a certificate but demoted out of
    // completed. The certificate is proof the course was finished.
    await queryRunner.query(
      `UPDATE "enrollment" e
          SET "status" = 'completed'
         FROM "certificate" c
        WHERE c."enrollmentId" = e."id" AND e."status" <> 'completed'`,
    );

    // BUG-02 — realign the completion date with the certificate the student
    // actually holds. The snapshot is the one shown to them and to the public
    // verification page, so it is the authority.
    await queryRunner.query(
      `UPDATE "enrollment" e
          SET "completedAt" = c."completionDate"
         FROM "certificate" c
        WHERE c."enrollmentId" = e."id"
          AND (e."completedAt" IS NULL
               OR e."completedAt" <> c."completionDate")`,
    );
  }

  public async down(): Promise<void> {
    // Intentionally empty — see the class comment.
  }
}
