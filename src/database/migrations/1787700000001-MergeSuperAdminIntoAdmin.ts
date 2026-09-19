import { MigrationInterface, QueryRunner } from 'typeorm';

const ADMIN = 1;
const SUPER_ADMIN = 3;

/**
 * Permission model §2.4 (BE-5, D1) — Admin and Super Admin are one role.
 *
 * Id 1 survives, not 3: the client and the user seed already key on 1.
 * Admin first takes every permission Super Admin held, so nobody moved across
 * loses anything; then holders move, and the role goes.
 *
 * **`down` does not move anyone back.** Which accounts were Super Admin is
 * exactly what `up` erases. It restores the role and its grants, so a rollback
 * leaves a working schema, and every former holder stays an Admin.
 */
export class MergeSuperAdminIntoAdmin1787700000001 implements MigrationInterface {
  name = 'MergeSuperAdminIntoAdmin1787700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "role_permission" ("role_id", "permission_id")
       SELECT $1, "permission_id" FROM "role_permission" WHERE "role_id" = $2
       ON CONFLICT ("role_id", "permission_id") DO NOTHING`,
      [ADMIN, SUPER_ADMIN],
    );

    await queryRunner.query(
      `UPDATE "user_role" SET "role_id" = $1 WHERE "role_id" = $2`,
      [ADMIN, SUPER_ADMIN],
    );
    await queryRunner.query(
      `UPDATE "user" SET "role_id" = $1 WHERE "role_id" = $2`,
      [ADMIN, SUPER_ADMIN],
    );
    await queryRunner.query(
      `DELETE FROM "role_permission" WHERE "role_id" = $1`,
      [SUPER_ADMIN],
    );
    await queryRunner.query(`DELETE FROM "role" WHERE "id" = $1`, [
      SUPER_ADMIN,
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "role" ("id", "name", "description", "is_active")
       VALUES ($1, 'Super Admin', 'Full access to all admin panel modules and actions.', true)
       ON CONFLICT ("id") DO NOTHING`,
      [SUPER_ADMIN],
    );
    await queryRunner.query(
      `INSERT INTO "role_permission" ("role_id", "permission_id")
       SELECT $1, "permission_id" FROM "role_permission" WHERE "role_id" = $2
       ON CONFLICT ("role_id", "permission_id") DO NOTHING`,
      [SUPER_ADMIN, ADMIN],
    );
  }
}
