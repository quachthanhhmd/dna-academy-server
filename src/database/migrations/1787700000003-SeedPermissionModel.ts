import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Permission model §2.6 (BE-9) — the permission catalogue and the built-in
 * grants, written once per database.
 *
 * A migration rather than a boot seed so that production gets the four new
 * permissions without anyone running `seed:run`, and so that a grant an
 * operator later revokes from Instructor through `/admin/roles` stays revoked.
 * Every insert is `ON CONFLICT DO NOTHING`, so a database the seeds already
 * filled is left as it is.
 *
 * **Must run after the generated student-data controllers are gone** (BE-2):
 * granting `courses:edit` to instructors while they were mounted opened every
 * student's data to every instructor.
 */
const MODULES: [string, string][] = [
  ['master_data', 'Master Data'],
  ['courses', 'Courses'],
  ['instructors', 'Instructors'],
  ['dashboard', 'Dashboard'],
  ['users', 'Users'],
  ['roles', 'Roles'],
];

const ACTIONS: [string, string][] = [
  ['view', 'View'],
  ['create', 'Create'],
  ['edit', 'Edit'],
  ['delete', 'Delete'],
  ['export', 'Export'],
  ['publish', 'Publish'],
];

const EXTRA: [string, string, string][] = [
  ['courses', 'edit_any', 'Edit any course'],
  ['dashboard', 'view_students', 'View students'],
  ['instructors', 'create_account', 'Create login account'],
  ['users', 'assign_role', 'Assign role'],
];

const INSTRUCTOR_GRANTS: [string, string][] = [
  ['dashboard', 'view'],
  ['courses', 'view'],
  ['courses', 'edit'],
];

export class SeedPermissionModel1787700000003 implements MigrationInterface {
  name = 'SeedPermissionModel1787700000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The grants below reference roles 1 and 4. On a fresh database the role
    // seed has not run yet; 4 exists since 1787300000000.
    await queryRunner.query(
      `INSERT INTO "role" ("id", "name", "is_active")
       VALUES (1, 'Admin', true), (2, 'User', true)
       ON CONFLICT ("id") DO NOTHING`,
    );

    for (const [name, label] of MODULES) {
      await queryRunner.query(
        `INSERT INTO "module" ("name", "label") VALUES ($1, $2)
         ON CONFLICT ("name") DO NOTHING`,
        [name, label],
      );
    }

    const permissions: [string, string, string][] = [
      ...MODULES.flatMap(([module]) =>
        ACTIONS.map(
          ([action, label]) =>
            [module, action, label] as [string, string, string],
        ),
      ),
      ...EXTRA,
    ];

    for (const [module, action, label] of permissions) {
      await queryRunner.query(
        `INSERT INTO "permission" ("module_id", "action", "label")
         SELECT m."id", $2, $3 FROM "module" m WHERE m."name" = $1
         ON CONFLICT ("module_id", "action") DO NOTHING`,
        [module, action, label],
      );
    }

    await queryRunner.query(
      `INSERT INTO "role_permission" ("role_id", "permission_id")
       SELECT 1, p."id" FROM "permission" p
       ON CONFLICT ("role_id", "permission_id") DO NOTHING`,
    );

    for (const [module, action] of INSTRUCTOR_GRANTS) {
      await queryRunner.query(
        `INSERT INTO "role_permission" ("role_id", "permission_id")
         SELECT 4, p."id"
           FROM "permission" p JOIN "module" m ON m."id" = p."module_id"
          WHERE m."name" = $1 AND p."action" = $2
         ON CONFLICT ("role_id", "permission_id") DO NOTHING`,
        [module, action],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only what this migration alone introduced: the four new permissions
    // (with their grants) and Instructor's grants. The base grid predates it.
    for (const [module, action] of INSTRUCTOR_GRANTS) {
      await queryRunner.query(
        `DELETE FROM "role_permission" rp
          USING "permission" p, "module" m
          WHERE rp."permission_id" = p."id" AND p."module_id" = m."id"
            AND rp."role_id" = 4 AND m."name" = $1 AND p."action" = $2`,
        [module, action],
      );
    }

    for (const [module, action] of EXTRA) {
      await queryRunner.query(
        `DELETE FROM "role_permission" rp
          USING "permission" p, "module" m
          WHERE rp."permission_id" = p."id" AND p."module_id" = m."id"
            AND m."name" = $1 AND p."action" = $2`,
        [module, action],
      );
      await queryRunner.query(
        `DELETE FROM "permission" p USING "module" m
          WHERE p."module_id" = m."id" AND m."name" = $1 AND p."action" = $2`,
        [module, action],
      );
    }
  }
}
