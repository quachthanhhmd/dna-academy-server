import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { SeedModule } from '../seeds/relational/seed.module';
import { RoleEnum } from '../../roles/roles.enum';
import { UserRoleRepository } from '../../user-roles/infrastructure/persistence/user-role.repository';

/**
 * Grants Admin to an existing account, by email.
 *
 * `AdminBootstrapSeedService` covers the first administrator on a fresh
 * deploy, but it only fires while *nobody* holds Admin. This is the tool for
 * afterwards: the one admin left the project, their account was deactivated
 * by mistake, or a second administrator is needed — situations where the
 * admin UI is exactly what you cannot reach.
 *
 *   npm run grant:admin -- someone@example.com            # show the plan
 *   npm run grant:admin -- someone@example.com --apply    # do it
 *
 * Why a script and not SQL: `setRole` writes to two places — the `user_role`
 * row *and* `user.role_id`. Hand-written SQL that inserts only into
 * `user_role` leaves the two disagreeing, and also has to get `assigned_at`
 * (NOT NULL, no default) and the `UX_user_role_user` conflict clause right.
 * Going through the repository makes all of that someone else's problem.
 *
 * Roles are exclusive (permission model D3, one role per user), so promoting
 * a learner REPLACES their `user` role rather than adding to it.
 */

type AccountRow = {
  id: number;
  email: string;
  statusId: number | null;
  roleName: string | null;
};

const STATUS_LABELS: Record<number, string> = {
  1: 'active',
  2: 'inactive (registered, email not confirmed — can still sign in)',
  3: 'deactivated (CANNOT sign in)',
};

const run = async (): Promise<void> => {
  const args = process.argv.slice(2).filter((a) => a !== '--apply');
  const apply = process.argv.includes('--apply');
  const email = args[0]?.trim().toLowerCase();

  if (!email) {
    console.error(
      'Usage: npm run grant:admin -- <email> [--apply]\n' +
        '       Without --apply nothing is changed.',
    );
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['warn', 'error'],
  });

  try {
    const dataSource = app.get(DataSource);
    const userRoles = app.get(UserRoleRepository);

    const [account]: AccountRow[] = await dataSource.query(
      `SELECT u."id", u."email", u."status_id" AS "statusId", r."name" AS "roleName"
         FROM "user" u
         LEFT JOIN "user_role" ur ON ur."user_id" = u."id"
         LEFT JOIN "role" r ON r."id" = ur."role_id"
        WHERE lower(u."email") = $1`,
      [email],
    );

    if (!account) {
      // Deliberately not created here: this script never invents a password.
      console.error(
        `No account with email ${email}.\n` +
          'Register it through the sign-up form first, then re-run this.',
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      `\n  account   ${account.email} (id ${account.id})\n` +
        `  status    ${STATUS_LABELS[account.statusId ?? 0] ?? account.statusId}\n` +
        `  role now  ${account.roleName ?? '(none)'}\n` +
        `  role after Admin\n`,
    );

    if (account.roleName === 'Admin') {
      console.log('Already an Admin. Nothing to do.');
      return;
    }

    // A deactivated account is blocked at the guard before any permission is
    // read, so granting Admin to one produces an administrator who cannot log
    // in — a confusing half-fix during an incident.
    if (account.statusId === 3) {
      console.error(
        'This account is deactivated and cannot sign in, so Admin would have ' +
          'no effect. Reactivate it first (status_id = 1), then re-run.',
      );
      process.exitCode = 1;
      return;
    }

    if (!apply) {
      console.log('Nothing was changed. Re-run with --apply to do it.');
      return;
    }

    // `assignedBy` is null: granted out-of-band by an operator, not by
    // another administrator through the UI.
    await userRoles.setRole(account.id, RoleEnum.admin, null);

    const [check]: { roleName: string | null; userRoleId: number | null }[] =
      await dataSource.query(
        `SELECT r."name" AS "roleName", u."role_id" AS "userRoleId"
           FROM "user" u
           LEFT JOIN "user_role" ur ON ur."user_id" = u."id"
           LEFT JOIN "role" r ON r."id" = ur."role_id"
          WHERE u."id" = $1`,
        [account.id],
      );

    // Both writes, verified: a mismatch here is the exact bug that raw SQL
    // causes, so it is worth failing loudly rather than reporting success.
    if (check?.roleName !== 'Admin' || check?.userRoleId !== RoleEnum.admin) {
      console.error(
        `Grant did not land as expected: user_role=${check?.roleName ?? 'none'}, ` +
          `user.role_id=${check?.userRoleId ?? 'null'}. Investigate before relying on it.`,
      );
      process.exitCode = 1;
      return;
    }

    console.log(`Granted Admin to ${account.email}.`);
  } finally {
    await app.close();
  }
};

void run();
