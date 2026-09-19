import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { Client } from 'pg';
import {
  connectDb,
  inRolledBackTransaction,
  insertUser,
  runDown,
  runUp,
} from '../utils/db';
import { AddAuthorizationConstraints1787700000000 } from '../../src/database/migrations/1787700000000-AddAuthorizationConstraints';
import { MergeSuperAdminIntoAdmin1787700000001 } from '../../src/database/migrations/1787700000001-MergeSuperAdminIntoAdmin';
import { NormaliseUserRoles1787700000002 } from '../../src/database/migrations/1787700000002-NormaliseUserRoles';
import { BackfillSocialLinks1787700000004 } from '../../src/database/migrations/1787700000004-BackfillSocialLinks';
import { AddDeactivatedStatus1787700000005 } from '../../src/database/migrations/1787700000005-AddDeactivatedStatus';

/**
 * Permission model §2.3–§2.5, run against real Postgres.
 *
 * The test stack migrates an empty database and seeds it afterwards, so on
 * their own these migrations only ever see empty tables. Each case here takes
 * the migration down inside a transaction, plants the rows a live database
 * actually has — Super Admin holders, learners with no `user_role`, duplicate
 * grants — brings it back up, checks the result and rolls everything back.
 */
describe('Permission model migrations', () => {
  let db: Client;
  const tag = `pmm.${Date.now()}`;

  beforeAll(async () => {
    db = await connectDb();
  });

  afterAll(async () => {
    await db.end();
  });

  const rolesOf = async (userId: number): Promise<number[]> => {
    const { rows } = await db.query(
      `SELECT "role_id" FROM "user_role" WHERE "user_id" = $1 ORDER BY "role_id"`,
      [userId],
    );
    return rows.map((row) => row.role_id as number);
  };

  const mirrorOf = async (userId: number): Promise<number | null> => {
    const { rows } = await db.query(
      `SELECT "role_id" FROM "user" WHERE "id" = $1`,
      [userId],
    );
    return rows[0].role_id as number | null;
  };

  const grant = (userId: number, roleId: number, assignedAt = 'now()') =>
    db.query(
      `INSERT INTO "user_role" ("user_id", "role_id", "assigned_at")
       VALUES ($1, $2, ${assignedAt})`,
      [userId, roleId],
    );

  const permissionIdsOf = async (roleId: number): Promise<string[]> => {
    const { rows } = await db.query(
      `SELECT "permission_id" FROM "role_permission" WHERE "role_id" = $1
        ORDER BY "permission_id"`,
      [roleId],
    );
    return rows.map((row) => row.permission_id as string);
  };

  const anyPermissionId = async (offset = 0): Promise<string> => {
    const { rows } = await db.query(
      `SELECT "id" FROM "permission" ORDER BY "id" OFFSET $1 LIMIT 1`,
      [offset],
    );
    return rows[0].id as string;
  };

  describe('AddAuthorizationConstraints', () => {
    const migration = new AddAuthorizationConstraints1787700000000();

    it('should collapse duplicate role grants into one', () =>
      inRolledBackTransaction(db, async () => {
        await runDown(db, migration);
        const permissionId = await anyPermissionId();
        await db.query(`DELETE FROM "role_permission" WHERE "role_id" = 2`);
        for (let i = 0; i < 3; i++) {
          await db.query(
            `INSERT INTO "role_permission" ("role_id", "permission_id") VALUES (2, $1)`,
            [permissionId],
          );
        }

        await runUp(db, migration);

        expect(await permissionIdsOf(2)).toEqual([permissionId]);
      }));

    it('should reject a second grant of the same permission to a role', () =>
      inRolledBackTransaction(db, async () => {
        const permissionId = await anyPermissionId();
        await db.query(`DELETE FROM "role_permission" WHERE "role_id" = 2`);
        await db.query(
          `INSERT INTO "role_permission" ("role_id", "permission_id") VALUES (2, $1)`,
          [permissionId],
        );

        await expect(
          db.query(
            `INSERT INTO "role_permission" ("role_id", "permission_id") VALUES (2, $1)`,
            [permissionId],
          ),
        ).rejects.toThrow(/UQ_role_permission/);
      }));

    it('should reject a second permission with the same module and action', () =>
      inRolledBackTransaction(db, async () => {
        await expect(
          db.query(
            `INSERT INTO "permission" ("module_id", "action", "label")
             SELECT "module_id", "action", 'dup' FROM "permission" LIMIT 1`,
          ),
        ).rejects.toThrow(/UQ_permission_module_action/);
      }));

    it('should reject a second module with the same name', () =>
      inRolledBackTransaction(db, async () => {
        await expect(
          db.query(
            `INSERT INTO "module" ("name", "label")
             SELECT "name", 'dup' FROM "module" LIMIT 1`,
          ),
        ).rejects.toThrow(/UQ_module_name/);
      }));

    // A duplicate module or permission cannot be merged blindly: grants point
    // at one of the copies. Refuse with a message, not a constraint error.
    it('should refuse to run when two modules share a name', () =>
      inRolledBackTransaction(db, async () => {
        await runDown(db, migration);
        await db.query(
          `INSERT INTO "module" ("name", "label") VALUES ('courses', 'dup')`,
        );

        await expect(runUp(db, migration)).rejects.toThrow(
          /Duplicate module names/,
        );
      }));

    it('should reject a second social link for the same identity', () =>
      inRolledBackTransaction(db, async () => {
        const userId = await insertUser(db, `${tag}.oauth@example.com`, 2);
        const insert = () =>
          db.query(
            `INSERT INTO "oauth_account" ("provider", "provider_uid", "user_id")
             VALUES ('facebook', $1, $2)`,
            [`${tag}-uid`, userId],
          );
        await insert();

        await expect(insert()).rejects.toThrow(/UX_oauth_account_identity/);
      }));
  });

  describe('MergeSuperAdminIntoAdmin', () => {
    const migration = new MergeSuperAdminIntoAdmin1787700000001();

    it('should move every Super Admin to Admin and delete the role', () =>
      inRolledBackTransaction(db, async () => {
        await runDown(db, migration);
        const holder = await insertUser(db, `${tag}.sa@example.com`, 3);
        await grant(holder, 3);

        await runUp(db, migration);

        expect(await rolesOf(holder)).toEqual([1]);
        expect(await mirrorOf(holder)).toBe(1);
        const { rowCount } = await db.query(
          `SELECT 1 FROM "role" WHERE "id" = 3`,
        );
        expect(rowCount).toBe(0);
      }));

    // Admin must not lose anything a Super Admin could do.
    it('should give Admin every permission Super Admin held', () =>
      inRolledBackTransaction(db, async () => {
        await runDown(db, migration);
        const onlySuperAdmin = await anyPermissionId(1);
        await db.query(
          `DELETE FROM "role_permission" WHERE "role_id" IN (1, 3)`,
        );
        await db.query(
          `INSERT INTO "role_permission" ("role_id", "permission_id") VALUES (3, $1)`,
          [onlySuperAdmin],
        );

        await runUp(db, migration);

        expect(await permissionIdsOf(1)).toEqual([onlySuperAdmin]);
      }));

    it('should succeed on a database that never had Super Admin', () =>
      inRolledBackTransaction(db, async () => {
        await db.query(`DELETE FROM "role" WHERE "id" = 3`);

        await expect(runUp(db, migration)).resolves.toBeUndefined();
      }));
  });

  describe('NormaliseUserRoles', () => {
    const migration = new NormaliseUserRoles1787700000002();

    // The seeded learners have `user.role_id = 2` and no `user_role` row at
    // all — under PermissionGuard alone they would have no role.
    it('should give a user with no user_role their legacy role', () =>
      inRolledBackTransaction(db, async () => {
        await runDown(db, migration);
        const learner = await insertUser(db, `${tag}.learner@example.com`, 2);

        await runUp(db, migration);

        expect(await rolesOf(learner)).toEqual([2]);
      }));

    it('should give a user with no role at all the User role', () =>
      inRolledBackTransaction(db, async () => {
        await runDown(db, migration);
        const orphan = await insertUser(db, `${tag}.orphan@example.com`, null);

        await runUp(db, migration);

        expect(await rolesOf(orphan)).toEqual([2]);
        expect(await mirrorOf(orphan)).toBe(2);
      }));

    // `admin@example.com` was role_id 1 with user_role 3: user_role wins.
    it('should make user.role_id mirror user_role where they disagree', () =>
      inRolledBackTransaction(db, async () => {
        await runDown(db, migration);
        const split = await insertUser(db, `${tag}.split@example.com`, 2);
        await grant(split, 4);

        await runUp(db, migration);

        expect(await rolesOf(split)).toEqual([4]);
        expect(await mirrorOf(split)).toBe(4);
      }));

    it.each([
      ['Admin over Instructor', [4, 1], 1],
      ['Instructor over User', [2, 4], 4],
      ['User over a custom role', [5, 2], 2],
    ])(
      'should keep the strongest role of a multi-role user: %s',
      (_label, held, kept) =>
        inRolledBackTransaction(db, async () => {
          await runDown(db, migration);
          await db.query(
            `INSERT INTO "role" ("id", "name", "is_active") VALUES (5, 'custom', true)
             ON CONFLICT ("id") DO NOTHING`,
          );
          const user = await insertUser(db, `${tag}.multi@example.com`, 2);
          for (const roleId of held) {
            await grant(user, roleId);
          }

          await runUp(db, migration);

          expect(await rolesOf(user)).toEqual([kept]);
          expect(await mirrorOf(user)).toBe(kept);
        }),
    );

    // Between two custom roles, the one held longest.
    it('should keep the earliest custom role between two custom roles', () =>
      inRolledBackTransaction(db, async () => {
        await runDown(db, migration);
        await db.query(
          `INSERT INTO "role" ("id", "name", "is_active")
           VALUES (5, 'custom a', true), (6, 'custom b', true)
           ON CONFLICT ("id") DO NOTHING`,
        );
        const user = await insertUser(db, `${tag}.customs@example.com`, 2);
        await grant(user, 6, `now() - interval '1 day'`);
        await grant(user, 5);

        await runUp(db, migration);

        expect(await rolesOf(user)).toEqual([6]);
      }));

    it('should reject a second role for the same user', () =>
      inRolledBackTransaction(db, async () => {
        const user = await insertUser(db, `${tag}.one@example.com`, 2);
        await grant(user, 2);

        await expect(grant(user, 4)).rejects.toThrow(/UX_user_role_user/);
      }));
  });
  // §2.8 — Google identities lived in user.social_id; the unified login only
  // reads oauth_account, so a returning Google user must find a link there.
  describe('BackfillSocialLinks', () => {
    const migration = new BackfillSocialLinks1787700000004();

    const linksOf = async (userId: number) => {
      const { rows } = await db.query(
        `SELECT "provider", "provider_uid" FROM "oauth_account" WHERE "user_id" = $1`,
        [userId],
      );
      return rows;
    };

    const socialUser = async (email: string, provider: string, uid: string) => {
      const id = await insertUser(db, email, 2);
      await db.query(
        `UPDATE "user" SET "provider" = $2, "social_id" = $3 WHERE "id" = $1`,
        [id, provider, uid],
      );
      return id;
    };

    it('should link a Google user by their legacy social id', () =>
      inRolledBackTransaction(db, async () => {
        const id = await socialUser(
          `${tag}.g@example.com`,
          'google',
          `${tag}-g`,
        );

        await runUp(db, migration);

        expect(await linksOf(id)).toEqual([
          { provider: 'google', provider_uid: `${tag}-g` },
        ]);
      }));

    // Apple sign-in is gone (D12); its identities have nowhere to sign in.
    it('should not link identities of a removed provider', () =>
      inRolledBackTransaction(db, async () => {
        const id = await socialUser(
          `${tag}.a@example.com`,
          'apple',
          `${tag}-a`,
        );

        await runUp(db, migration);

        expect(await linksOf(id)).toEqual([]);
      }));

    it('should leave an identity that is already linked alone', () =>
      inRolledBackTransaction(db, async () => {
        const owner = await insertUser(db, `${tag}.owner@example.com`, 2);
        await db.query(
          `INSERT INTO "oauth_account" ("provider", "provider_uid", "user_id")
           VALUES ('google', $1, $2)`,
          [`${tag}-dup`, owner],
        );
        const other = await socialUser(
          `${tag}.other@example.com`,
          'google',
          `${tag}-dup`,
        );

        await runUp(db, migration);

        expect(await linksOf(owner)).toHaveLength(1);
        expect(await linksOf(other)).toEqual([]);
      }));
  });

  describe('AddDeactivatedStatus', () => {
    const migration = new AddDeactivatedStatus1787700000005();

    it('should add status 3, Deactivated', () =>
      inRolledBackTransaction(db, async () => {
        await runDown(db, migration);

        await runUp(db, migration);

        const { rows } = await db.query(
          `SELECT "id", "name" FROM "status" WHERE "id" = 3`,
        );
        expect(rows).toEqual([{ id: 3, name: 'Deactivated' }]);
      }));
  });
});
