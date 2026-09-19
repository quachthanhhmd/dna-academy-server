import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Permission model D9 — a status an admin can switch an account to.
 *
 * `inactive` already means "email not confirmed yet", which still signs in
 * and which confirming the email undoes. Deactivating through it would do
 * neither thing an admin means by it.
 */
export class AddDeactivatedStatus1787700000005 implements MigrationInterface {
  name = 'AddDeactivatedStatus1787700000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "status" ("id", "name") VALUES (3, 'Deactivated')
       ON CONFLICT ("id") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "user" SET "status_id" = 2 WHERE "status_id" = 3`,
    );
    await queryRunner.query(`DELETE FROM "status" WHERE "id" = 3`);
  }
}
