import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Permission model §2.5 (BE-6, D2, D3) — one role per user, and `user_role`
 * is where it lives.
 *
 * Before this the two systems disagreed: the seeded admin was
 * `user.role_id = 1` but `user_role = 3`, and ordinary learners had no
 * `user_role` row at all — under `PermissionGuard` alone they had no role.
 *
 * 1. Every user without a `user_role` row gets one, from the legacy column,
 *    or User when even that is empty.
 * 2. A user holding several roles keeps the strongest: Admin, then
 *    Instructor, then User, then custom roles by how long they were held.
 *    None exist today; kept so the migration is correct on any database.
 * 3. `UNIQUE (user_id)` makes one role per user a rule instead of a habit.
 * 4. `user.role_id` becomes a mirror of `user_role`, which it stays until its
 *    last reader is gone and a later migration drops it.
 */
export class NormaliseUserRoles1787700000002 implements MigrationInterface {
  name = 'NormaliseUserRoles1787700000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "user_role" ("user_id", "role_id", "assigned_at")
       SELECT u."id", COALESCE(u."role_id", 2), now()
         FROM "user" u
        WHERE NOT EXISTS (SELECT 1 FROM "user_role" ur WHERE ur."user_id" = u."id")`,
    );

    await queryRunner.query(
      `DELETE FROM "user_role" ur
        USING (SELECT "id", ROW_NUMBER() OVER (
                 PARTITION BY "user_id"
                 ORDER BY CASE "role_id" WHEN 1 THEN 0 WHEN 4 THEN 1 WHEN 2 THEN 2 ELSE 3 END,
                          "assigned_at", "id"
               ) AS rn
                 FROM "user_role") ranked
        WHERE ur."id" = ranked."id" AND ranked.rn > 1`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UX_user_role_user" ON "user_role" ("user_id")`,
    );

    await queryRunner.query(
      `UPDATE "user" u
          SET "role_id" = ur."role_id"
         FROM "user_role" ur
        WHERE ur."user_id" = u."id"
          AND u."role_id" IS DISTINCT FROM ur."role_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The rows collapsed by `up` are gone for good; only the rule is lifted.
    await queryRunner.query(`DROP INDEX "UX_user_role_user"`);
  }
}
