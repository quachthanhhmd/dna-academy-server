import { Injectable } from '@nestjs/common';
import slugify from 'slugify';
import { EntityManager } from 'typeorm';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';

/** The SQL a role change runs inside its transaction. */
@Injectable()
export class UserRoleChangeRepository {
  /**
   * Ids of active Admins, with their `user_role` rows locked until the
   * transaction ends. Two admins demoting each other at the same moment then
   * run one after the other, and the second sees the first's change — without
   * the lock both could see "another admin remains" and leave none.
   */
  async lockActiveAdminIds(em: EntityManager): Promise<number[]> {
    const rows: { user_id: number }[] = await em.query(
      `SELECT ur."user_id"
         FROM "user_role" ur
         JOIN "user" u ON u."id" = ur."user_id"
        WHERE ur."role_id" = $1
          AND u."deleted_at" IS NULL
          AND u."status_id" IS DISTINCT FROM $2
          FOR UPDATE OF ur`,
      [RoleEnum.admin, StatusEnum.deactivated],
    );

    return rows.map((row) => row.user_id);
  }

  async findProfile(
    em: EntityManager,
    userId: number,
  ): Promise<{ id: string; isActive: boolean } | null> {
    const rows: { id: string; is_active: boolean }[] = await em.query(
      `SELECT "id", "is_active" FROM "instructor" WHERE "user_id" = $1`,
      [userId],
    );

    return rows[0] ? { id: rows[0].id, isActive: rows[0].is_active } : null;
  }

  async countTaughtCourses(
    em: EntityManager,
    instructorId: string,
  ): Promise<number> {
    const [{ count }] = await em.query(
      `SELECT COUNT(*)::int AS "count" FROM "course_instructor"
        WHERE "instructor_id" = $1`,
      [instructorId],
    );

    return count;
  }

  /**
   * A draft profile: inactive, so it stays off the public catalogue until an
   * admin fills it in, named after the account.
   */
  async createDraftProfile(
    em: EntityManager,
    userId: number,
    createdById: number,
  ): Promise<string> {
    const [user] = await em.query(
      `SELECT "full_name", "email" FROM "user" WHERE "id" = $1`,
      [userId],
    );
    const fullName: string = user.full_name || user.email || 'Instructor';
    const base =
      slugify(fullName, { lower: true, strict: true }) || 'instructor';

    let slug = base;
    for (let suffix = 2; ; suffix += 1) {
      const taken = await em.query(
        `SELECT 1 FROM "instructor" WHERE "slug" = $1`,
        [slug],
      );
      if (taken.length === 0) break;
      slug = `${base}-${suffix}`;
    }

    const [created] = await em.query(
      `INSERT INTO "instructor" ("user_id", "created_by_id", "slug", "full_name", "is_active")
       VALUES ($1, $2, $3, $4, false)
       RETURNING "id"`,
      [userId, createdById, slug, fullName],
    );

    return created.id;
  }

  async setProfileActive(
    em: EntityManager,
    instructorId: string,
    isActive: boolean,
  ): Promise<void> {
    await em.query(
      `UPDATE "instructor" SET "is_active" = $2, "updated_at" = now() WHERE "id" = $1`,
      [instructorId, isActive],
    );
  }
}
