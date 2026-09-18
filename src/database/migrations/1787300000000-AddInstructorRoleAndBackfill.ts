import { MigrationInterface, QueryRunner } from 'typeorm';
import { RoleEnum } from '../../roles/roles.enum';

const INSTRUCTOR_ID = RoleEnum.instructor;
const INSTRUCTOR_NAME = 'Instructor';
const INSTRUCTOR_DESCRIPTION =
  'A teaching account. Excluded from student metrics; grants no admin access.';

/** Every column that points at `role.id`. */
const ROLE_REFERENCES: readonly [string, string][] = [
  ['user', 'role_id'],
  ['user_role', 'role_id'],
  ['role_permission', 'role_id'],
];

/**
 * Epic 7 BE-0 (D1) — a distinct `instructor` role, so teaching accounts stop
 * being counted as students.
 *
 * The dashboard defines "registered students" as `user.role_id = 2`. Every
 * teaching account currently holds that same role, so without the backfill
 * below the student KPI stays inflated by the size of the faculty and D1
 * changes nothing.
 *
 * **Id 4 may already be occupied.** `RoleEnum` is a compile-time constant, so
 * the instructor role has to *be* id 4 — but roles created through the admin
 * panel take `MAX(id) + 1`, and a suite that ran against a shared database has
 * left rows sitting on the next few ids. (The dev database has 60 of them,
 * named `UR Custom Role <timestamp>`.) Inserting with `ON CONFLICT DO NOTHING`
 * would be the quiet disaster here: no instructor role would exist, and the
 * backfill would then move every teaching account onto whatever role happens
 * to hold id 4.
 *
 * So a squatter is moved out of the way instead, to a fresh `MAX(id) + 1`,
 * carrying its foreign keys with it. That id was allocated dynamically in the
 * first place and means nothing to anyone; id 4 does.
 */
export class AddInstructorRoleAndBackfill1787300000000 implements MigrationInterface {
  name = 'AddInstructorRoleAndBackfill1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [occupant] = await queryRunner.query(
      `SELECT "name" FROM "role" WHERE "id" = $1`,
      [INSTRUCTOR_ID],
    );

    if (occupant && occupant.name !== INSTRUCTOR_NAME) {
      await this.relocate(queryRunner);
    }

    await queryRunner.query(
      `INSERT INTO "role" ("id", "name", "description", "is_active")
       VALUES ($1, $2, $3, true)
       ON CONFLICT ("id") DO UPDATE
          SET "name" = EXCLUDED."name",
              "description" = EXCLUDED."description"`,
      [INSTRUCTOR_ID, INSTRUCTOR_NAME, INSTRUCTOR_DESCRIPTION],
    );

    /**
     * `instructor.user_id` is a nullable one-to-one: an instructor profile
     * with no login account is normal, and the join skips it.
     *
     * Only role 2 is moved. An admin who also teaches keeps the stronger
     * role — demoting a superAdmin because they have a teaching profile would
     * lock them out of the panel.
     */
    await queryRunner.query(
      `UPDATE "user" u
          SET "role_id" = $1
         FROM "instructor" i
        WHERE i."user_id" = u."id"
          AND u."role_id" = $2`,
      [INSTRUCTOR_ID, RoleEnum.user],
    );
  }

  /** Moves whatever holds id 4 to a fresh id, with its references. */
  private async relocate(queryRunner: QueryRunner): Promise<void> {
    const [{ next }] = await queryRunner.query(
      `SELECT COALESCE(MAX("id"), 0) + 1 AS next FROM "role"`,
    );

    // Insert the copy first: the foreign keys cannot point at an id that does
    // not exist yet, so the old row can only be dropped once they have moved.
    await queryRunner.query(
      `INSERT INTO "role" ("id", "name", "description", "is_active")
       SELECT $1, "name", "description", "is_active" FROM "role" WHERE "id" = $2`,
      [next, INSTRUCTOR_ID],
    );

    for (const [table, column] of ROLE_REFERENCES) {
      await queryRunner.query(
        `UPDATE "${table}" SET "${column}" = $1 WHERE "${column}" = $2`,
        [next, INSTRUCTOR_ID],
      );
    }

    await queryRunner.query(`DELETE FROM "role" WHERE "id" = $1`, [
      INSTRUCTOR_ID,
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Send the teaching accounts back to `user`, which is where they came from.
    await queryRunner.query(
      `UPDATE "user" SET "role_id" = $1 WHERE "role_id" = $2`,
      [RoleEnum.user, INSTRUCTOR_ID],
    );

    await queryRunner.query(
      `DELETE FROM "role" WHERE "id" = $1 AND "name" = $2`,
      [INSTRUCTOR_ID, INSTRUCTOR_NAME],
    );

    // A relocated role is deliberately left at its new id. Its id was
    // allocated dynamically and carries no meaning, and moving it back would
    // race the next run of `up()` for the same number.
  }
}
