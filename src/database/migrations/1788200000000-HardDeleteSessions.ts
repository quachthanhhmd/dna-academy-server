import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `session` stops being soft-deleted.
 *
 * A session is the shortest-lived row in the schema — one per sign-in, gone
 * on logout, on a password change, on an admin deactivating an account, and
 * on refresh-token replay — and nothing ever reads a dead one. On the
 * database this ran against, 1119 of 1315 rows (85%) were tombstones, and
 * `IDX_..._user_id` does not include `deleted_at`, so every lookup walked
 * them only to discard them.
 *
 * **The two statements below must stay in this order.** Dropping the column
 * first would silently resurrect every revoked session: with `deleted_at`
 * gone, TypeORM no longer appends `deleted_at IS NULL`, so each tombstone
 * would read back as a live session and its old refresh token would work
 * again. Deleting the rows first means there is nothing left to resurrect.
 * Both run inside the migration's transaction, so a failure leaves the table
 * as it was.
 */
export class HardDeleteSessions1788200000000 implements MigrationInterface {
  name = 'HardDeleteSessions1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Discard the tombstones while the column still marks them.
    const deleted = await queryRunner.query(
      `DELETE FROM "session" WHERE "deleted_at" IS NOT NULL`,
    );
    console.log(
      `[HardDeleteSessions] removed ${
        Array.isArray(deleted) ? (deleted[1] ?? 0) : 0
      } revoked session rows`,
    );

    // 2. Only now is it safe for the column to go.
    await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "deleted_at"`);
  }

  /**
   * Restores the column so the schema matches the previous entity, but the
   * rows this migration deleted are gone for good. That is not recoverable
   * and does not need to be: a reverted deployment reads the remaining rows
   * as live sessions, which is exactly what they are.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "session" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
  }
}
