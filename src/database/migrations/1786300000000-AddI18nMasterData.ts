import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Epic 6 — bilingual (VI / EN) master data.
 *
 * Adds JSONB translation columns to `master_data_group` and
 * `master_data_code`, a preferred-locale column on `user`, backfills the
 * default locale from the existing plain columns, and locks the invariant in
 * with a CHECK constraint.
 *
 * Column names are camelCase to match every other table in this schema — the
 * epic writes them snake_case, but the codebase and TypeORM naming strategy
 * are camelCase.
 *
 * Note this migration only guarantees the SHAPE of the data. The Vietnamese
 * and English wording for the seeded rows is applied — by upsert, never by
 * delete/insert, so foreign keys from `course`, `instructor_expertise`,
 * `student_profile` etc. keep pointing at the same ids — by the master data
 * seed (`npm run seed:run:relational`, and automatically on every boot).
 */
export class AddI18nMasterData1786300000000 implements MigrationInterface {
  name = 'AddI18nMasterData1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- 1. Translation columns -----------------------------------------
    for (const table of ['master_data_group', 'master_data_code']) {
      await queryRunner.query(
        `ALTER TABLE "${table}"
           ADD "nameTranslations" jsonb NOT NULL DEFAULT '{}',
           ADD "descriptionTranslations" jsonb NOT NULL DEFAULT '{}'`,
      );
    }

    // --- 2. Preferred UI locale on the user ------------------------------
    await queryRunner.query(
      `ALTER TABLE "user" ADD "locale" character varying NOT NULL DEFAULT 'vi'`,
    );

    // --- 3. Backfill the default locale from the plain columns -----------
    // Existing values are English but are adopted as the `vi` slot so the
    // CHECK constraint below can be applied unconditionally; the seed then
    // upserts the real Vietnamese wording over them.
    for (const table of ['master_data_group', 'master_data_code']) {
      await queryRunner.query(
        `UPDATE "${table}"
            SET "nameTranslations" = jsonb_build_object('vi', "name")
          WHERE "nameTranslations" = '{}'::jsonb
            AND "name" IS NOT NULL`,
      );
      await queryRunner.query(
        `UPDATE "${table}"
            SET "descriptionTranslations" = jsonb_build_object('vi', "description")
          WHERE "descriptionTranslations" = '{}'::jsonb
            AND "description" IS NOT NULL
            AND "description" <> ''`,
      );
    }

    // --- 4. Guarantee the default locale is always present ---------------
    for (const table of ['master_data_group', 'master_data_code']) {
      await queryRunner.query(
        `ALTER TABLE "${table}"
           ADD CONSTRAINT "CK_${table}_name_has_default_locale"
           CHECK ("nameTranslations" ? 'vi')`,
      );
    }

    // --- 5. Index the hot lookup: codes of a group, active, ordered ------
    await queryRunner.query(
      `CREATE INDEX "IDX_master_data_code_group_active_order"
         ON "master_data_code" ("displayOrder", "groupId", "isActive")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_master_data_code_group_active_order"`,
    );

    for (const table of ['master_data_code', 'master_data_group']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT "CK_${table}_name_has_default_locale"`,
      );
    }

    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "locale"`);

    for (const table of ['master_data_code', 'master_data_group']) {
      await queryRunner.query(
        `ALTER TABLE "${table}"
           DROP COLUMN "descriptionTranslations",
           DROP COLUMN "nameTranslations"`,
      );
    }
  }
}
