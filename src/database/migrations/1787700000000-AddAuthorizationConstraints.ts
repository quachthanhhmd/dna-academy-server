import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Permission model §2.3 (BE-4) — the constraints that make the authorization
 * tables mean one thing each.
 *
 * Without them no seed is idempotent, and a role can hold the same permission
 * twice: revoking one copy through `/admin/roles` would leave the grant in
 * place.
 *
 * Duplicate grants are collapsed — they are identical rows. Duplicate modules
 * or permissions are **not**: each copy may carry its own grants, so picking
 * one would silently revoke whatever pointed at the other. The migration stops
 * and says so instead.
 *
 * `(provider, provider_uid)` on `oauth_account` is already unique since
 * `1787600000000`; this adds the lookup index social-link listing needs.
 */
export class AddAuthorizationConstraints1787700000000 implements MigrationInterface {
  name = 'AddAuthorizationConstraints1787700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.refuseDuplicates(
      queryRunner,
      `SELECT "name" FROM "module" GROUP BY "name" HAVING COUNT(*) > 1`,
      'Duplicate module names',
    );
    await this.refuseDuplicates(
      queryRunner,
      `SELECT "module_id", "action" FROM "permission"
        GROUP BY "module_id", "action" HAVING COUNT(*) > 1`,
      'Duplicate permissions (module, action)',
    );

    await queryRunner.query(
      `DELETE FROM "role_permission" a
        USING "role_permission" b
        WHERE a."role_id" = b."role_id"
          AND a."permission_id" = b."permission_id"
          AND a."id" > b."id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "module" ADD CONSTRAINT "UQ_module_name" UNIQUE ("name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "permission"
         ADD CONSTRAINT "UQ_permission_module_action" UNIQUE ("module_id", "action")`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission"
         ADD CONSTRAINT "UQ_role_permission" UNIQUE ("role_id", "permission_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_oauth_account_user" ON "oauth_account" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_oauth_account_user"`);
    await queryRunner.query(
      `ALTER TABLE "role_permission" DROP CONSTRAINT "UQ_role_permission"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permission" DROP CONSTRAINT "UQ_permission_module_action"`,
    );
    await queryRunner.query(
      `ALTER TABLE "module" DROP CONSTRAINT "UQ_module_name"`,
    );
  }

  private async refuseDuplicates(
    queryRunner: QueryRunner,
    sql: string,
    what: string,
  ): Promise<void> {
    const duplicates: unknown[] = await queryRunner.query(sql);

    if (duplicates.length > 0) {
      throw new Error(
        `${what} exist (${duplicates.length}). Merge them by hand, moving ` +
          'their grants, before migrating — see AddAuthorizationConstraints1787700000000.',
      );
    }
  }
}
