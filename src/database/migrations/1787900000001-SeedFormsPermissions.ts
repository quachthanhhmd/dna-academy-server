import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The `forms` permission module and its four actions (EPIC-08 §5).
 *
 * A migration rather than a boot seed, for the same reason as
 * `SeedPermissionModel`: production gets the grants without anyone running
 * `seed:run`, and a grant an operator later revokes stays revoked. Admin is
 * granted all four; Instructor none — form data is org-level, so no
 * `CourseAccess` rule applies.
 *
 * `manage`, `analytics` and `view`/`export` do not all fit the module × action
 * grid the seed uses (`manage`/`analytics` are not standard actions), so each
 * is inserted explicitly rather than derived from `PERMISSION_ACTIONS`.
 */
const MODULE: [string, string] = ['forms', 'Forms'];

const PERMISSIONS: [string, string][] = [
  ['view', 'View submissions'],
  ['manage', 'Manage submissions'],
  ['analytics', 'View analytics'],
  ['export', 'Export submissions'],
];

export class SeedFormsPermissions1787900000001 implements MigrationInterface {
  name = 'SeedFormsPermissions1787900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "module" ("name", "label") VALUES ($1, $2)
       ON CONFLICT ("name") DO NOTHING`,
      MODULE,
    );

    for (const [action, label] of PERMISSIONS) {
      await queryRunner.query(
        `INSERT INTO "permission" ("module_id", "action", "label")
         SELECT m."id", $2, $3 FROM "module" m WHERE m."name" = $1
         ON CONFLICT ("module_id", "action") DO NOTHING`,
        [MODULE[0], action, label],
      );
    }

    // Admin (role 1) holds every forms permission.
    await queryRunner.query(
      `INSERT INTO "role_permission" ("role_id", "permission_id")
       SELECT 1, p."id"
         FROM "permission" p JOIN "module" m ON m."id" = p."module_id"
        WHERE m."name" = $1
       ON CONFLICT ("role_id", "permission_id") DO NOTHING`,
      [MODULE[0]],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permission" rp
        USING "permission" p, "module" m
        WHERE rp."permission_id" = p."id" AND p."module_id" = m."id"
          AND m."name" = $1`,
      [MODULE[0]],
    );

    for (const [action] of PERMISSIONS) {
      await queryRunner.query(
        `DELETE FROM "permission" p
          USING "module" m
          WHERE p."module_id" = m."id" AND m."name" = $1 AND p."action" = $2`,
        [MODULE[0], action],
      );
    }

    await queryRunner.query(`DELETE FROM "module" WHERE "name" = $1`, [
      MODULE[0],
    ]);
  }
}
