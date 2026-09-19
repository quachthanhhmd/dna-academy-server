import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * What a user may do, read from `user_role` → `role_permission` on every call
 * (permission model D2, D4).
 *
 * Nothing here is cached and nothing is read from the token, so a role change
 * takes effect on the caller's next request (AC-12). Callers ask about
 * permissions, never about role names — a custom role holding
 * `courses:edit_any` is treated exactly like Admin.
 */
@Injectable()
export class AuthorizationService {
  constructor(private readonly dataSource: DataSource) {}

  /** `module:action` keys the user holds, sorted and deduplicated. */
  async permissionsOf(userId: number): Promise<string[]> {
    const rows: { key: string }[] = await this.dataSource.query(
      `SELECT DISTINCT m."name" || ':' || p."action" AS "key"
         FROM "user_role" ur
         JOIN "role_permission" rp ON rp."role_id" = ur."role_id"
         JOIN "permission" p ON p."id" = rp."permission_id"
         JOIN "module" m ON m."id" = p."module_id"
        WHERE ur."user_id" = $1
        ORDER BY 1`,
      [userId],
    );

    return rows.map((row) => row.key);
  }

  /** `module:action` keys a role grants, sorted. */
  async permissionsOfRole(roleId: number): Promise<string[]> {
    const rows: { key: string }[] = await this.dataSource.query(
      `SELECT DISTINCT m."name" || ':' || p."action" AS "key"
         FROM "role_permission" rp
         JOIN "permission" p ON p."id" = rp."permission_id"
         JOIN "module" m ON m."id" = p."module_id"
        WHERE rp."role_id" = $1
        ORDER BY 1`,
      [roleId],
    );

    return rows.map((row) => row.key);
  }

  async hasPermission(
    userId: number,
    module: string,
    action: string,
  ): Promise<boolean> {
    const rows: unknown[] = await this.dataSource.query(
      `SELECT 1
         FROM "user_role" ur
         JOIN "role_permission" rp ON rp."role_id" = ur."role_id"
         JOIN "permission" p ON p."id" = rp."permission_id"
         JOIN "module" m ON m."id" = p."module_id"
        WHERE ur."user_id" = $1 AND m."name" = $2 AND p."action" = $3
        LIMIT 1`,
      [userId, module, action],
    );

    return rows.length > 0;
  }

  /** The role a user holds, for display only — never for authorization. */
  async roleOf(userId: number): Promise<{ id: number; name: string } | null> {
    const rows: { id: number; name: string }[] = await this.dataSource.query(
      `SELECT r."id", r."name"
         FROM "user_role" ur JOIN "role" r ON r."id" = ur."role_id"
        WHERE ur."user_id" = $1`,
      [userId],
    );

    return rows[0] ?? null;
  }
}
