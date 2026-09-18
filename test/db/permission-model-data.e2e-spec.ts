import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { Client } from 'pg';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { connectDb } from '../utils/db';

/**
 * Permission model AC-6 and §2.6 — the state a freshly migrated and seeded
 * database is in, and the state registration leaves a new account in.
 */
describe('Permission model data', () => {
  const app = APP_URL;
  let db: Client;

  beforeAll(async () => {
    db = await connectDb();
  });

  afterAll(async () => {
    await db.end();
  });

  const permissionsOfRole = async (roleId: number): Promise<string[]> => {
    const { rows } = await db.query(
      `SELECT m."name" || ':' || p."action" AS "key"
         FROM "role_permission" rp
         JOIN "permission" p ON p."id" = rp."permission_id"
         JOIN "module" m ON m."id" = p."module_id"
        WHERE rp."role_id" = $1
        ORDER BY 1`,
      [roleId],
    );
    return rows.map((row) => row.key as string);
  };

  describe('roles (AC-6)', () => {
    it('should give every user exactly one role', async () => {
      const { rows } = await db.query(
        `SELECT u."id", COUNT(ur."id")::int AS "roles"
           FROM "user" u LEFT JOIN "user_role" ur ON ur."user_id" = u."id"
          GROUP BY u."id"
         HAVING COUNT(ur."id") <> 1`,
      );

      expect(rows).toEqual([]);
    });

    it('should keep user.role_id equal to the user_role row', async () => {
      const { rows } = await db.query(
        `SELECT u."id" FROM "user" u
           JOIN "user_role" ur ON ur."user_id" = u."id"
          WHERE u."role_id" IS DISTINCT FROM ur."role_id"`,
      );

      expect(rows).toEqual([]);
    });

    it('should no longer have a Super Admin role', async () => {
      const { rowCount } = await db.query(
        `SELECT 1 FROM "role" WHERE "id" = 3`,
      );

      expect(rowCount).toBe(0);
    });

    it('should seed admin@example.com as Admin', async () => {
      const { rows } = await db.query(
        `SELECT ur."role_id" FROM "user_role" ur
           JOIN "user" u ON u."id" = ur."user_id"
          WHERE u."email" = 'admin@example.com'`,
      );

      expect(rows).toEqual([{ role_id: 1 }]);
    });

    it('should give a newly registered account the User role', async () => {
      const email = `pmd.register.${Date.now()}@example.com`;
      await request(app)
        .post('/api/v1/auth/email/register')
        .send({ email, password: 'secret', firstName: 'P', lastName: 'M' })
        .expect(204);

      const { rows } = await db.query(
        `SELECT ur."role_id" AS "granted", u."role_id" AS "mirror"
           FROM "user" u JOIN "user_role" ur ON ur."user_id" = u."id"
          WHERE u."email" = $1`,
        [email],
      );

      expect(rows).toEqual([{ granted: 2, mirror: 2 }]);
    });
  });

  describe('permission seed (§2.6)', () => {
    it('should seed the four new permissions', async () => {
      const { rows } = await db.query(
        `SELECT m."name" || ':' || p."action" AS "key"
           FROM "permission" p JOIN "module" m ON m."id" = p."module_id"
          WHERE (m."name", p."action") IN (
                  ('courses', 'edit_any'), ('dashboard', 'view_students'),
                  ('instructors', 'create_account'), ('users', 'assign_role'))
          ORDER BY 1`,
      );

      expect(rows.map((row) => row.key)).toEqual([
        'courses:edit_any',
        'dashboard:view_students',
        'instructors:create_account',
        'users:assign_role',
      ]);
    });

    it('should grant Admin every permission there is', async () => {
      const { rows } = await db.query(
        `SELECT COUNT(*)::int AS "missing" FROM "permission" p
          WHERE NOT EXISTS (SELECT 1 FROM "role_permission" rp
                             WHERE rp."role_id" = 1 AND rp."permission_id" = p."id")`,
      );

      expect(rows[0].missing).toBe(0);
      expect((await permissionsOfRole(1)).length).toBe(40);
    });

    it('should grant Instructor exactly its three permissions', async () => {
      expect(await permissionsOfRole(4)).toEqual([
        'courses:edit',
        'courses:view',
        'dashboard:view',
      ]);
    });

    it('should grant User nothing', async () => {
      expect(await permissionsOfRole(2)).toEqual([]);
    });
  });
});
