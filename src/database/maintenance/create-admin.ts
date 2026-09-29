import { NestFactory } from '@nestjs/core';
import bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SeedModule } from '../seeds/relational/seed.module';
import { UserEntity } from '../../users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../../roles/roles.enum';
import { StatusEnum } from '../../statuses/statuses.enum';
import { UserRoleRepository } from '../../user-roles/infrastructure/persistence/user-role.repository';

/**
 * Creates an administrator account directly, without the public sign-up form.
 *
 *   npm run create:admin -- admin@yourdomain.com
 *   npm run create:admin -- admin@yourdomain.com --name "Thanh Quach"
 *
 * Why this exists alongside `AdminBootstrapSeedService`: that one only grants
 * a role to an account somebody already registered, which means the sign-up
 * form has to be reachable and `register()` has to succeed — and `register()`
 * sends a confirmation email with no try/catch, so an unconfigured SMTP turns
 * the first admin's registration into a 500. This path touches neither.
 *
 * The account is created the way `UserSeedService` creates its fixtures, with
 * three differences that matter for an administrator:
 *   - `status = active` (not `inactive`), so nothing is pending
 *   - `email_verified = true`, since no confirmation mail is ever sent
 *   - no `student_profile` row: an administrator is not a learner, and the
 *     dashboard counts students by role
 *
 * THE PASSWORD IS NEVER A COMMAND-LINE ARGUMENT. Arguments land in shell
 * history and are readable by any process via `ps`. It is read from a hidden
 * prompt, or from ADMIN_INITIAL_PASSWORD when there is no terminal.
 */

/** Well above the app's `@MinLength(6)`: this account holds every permission. */
const MINIMUM_PASSWORD_LENGTH = 12;

const promptHidden = (question: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const input = process.stdin;

    if (!input.isTTY) {
      reject(
        new Error(
          'No terminal to prompt on. Either run with `docker compose exec -it`, ' +
            'or pass the password through the ADMIN_INITIAL_PASSWORD variable.',
        ),
      );
      return;
    }

    process.stdout.write(question);
    input.setRawMode(true);
    input.resume();
    input.setEncoding('utf8');

    let value = '';

    const finish = (err?: Error) => {
      input.setRawMode(false);
      input.pause();
      input.removeListener('data', onData);
      process.stdout.write('\n');
      if (err) reject(err);
      else resolve(value);
    };

    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (
          character === '\n' ||
          character === '\r' ||
          character === '\u0004'
        ) {
          finish();
          return;
        }
        if (character === '\u0003') {
          finish(new Error('Cancelled.'));
          return;
        }
        // Backspace / delete, so a typo is fixable on a prompt that echoes nothing.
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };

    input.on('data', onData);
  });

const readPassword = async (): Promise<string> => {
  const fromEnvironment = process.env.ADMIN_INITIAL_PASSWORD;

  if (fromEnvironment) {
    return fromEnvironment;
  }

  const password = await promptHidden('Password (not shown): ');
  const again = await promptHidden('Repeat it: ');

  if (password !== again) {
    throw new Error('The two entries differ.');
  }

  return password;
};

const run = async (): Promise<void> => {
  const argv = process.argv.slice(2);
  const nameIndex = argv.indexOf('--name');
  const fullName = nameIndex >= 0 ? argv[nameIndex + 1] : undefined;
  const email = argv
    .find((a) => !a.startsWith('--') && a !== fullName)
    ?.trim()
    .toLowerCase();

  if (!email || !email.includes('@')) {
    console.error(
      'Usage: npm run create:admin -- <email> [--name "Full Name"]\n' +
        '\n' +
        'The password is asked for on a hidden prompt — never pass it as an\n' +
        'argument. Without a terminal, set ADMIN_INITIAL_PASSWORD instead.',
    );
    process.exitCode = 1;
    return;
  }

  let password: string;
  try {
    password = await readPassword();
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
    return;
  }

  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    console.error(
      `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters. ` +
        'This account holds every permission in the system.',
    );
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['warn', 'error'],
  });

  try {
    const users: Repository<UserEntity> = app.get(
      getRepositoryToken(UserEntity),
    );
    const userRoles = app.get(UserRoleRepository);
    const dataSource = app.get(DataSource);

    // Never silently reset an existing account's password.
    const existing = await users.findOne({ where: { email } });

    if (existing) {
      console.error(
        `${email} already exists (id ${existing.id}).\n` +
          'To give an existing account Admin, use:\n' +
          `  npm run grant:admin -- ${email} --apply`,
      );
      process.exitCode = 1;
      return;
    }

    const [firstName, ...rest] = (fullName ?? 'Site Admin').trim().split(/\s+/);
    const lastName = rest.join(' ') || 'Admin';

    const salt = await bcrypt.genSalt();

    const created = await users.save(
      users.create({
        email,
        password: await bcrypt.hash(password, salt),
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        // No confirmation mail is sent for this account, so leaving it
        // unverified would strand it behind a link that never arrives.
        emailVerified: true,
        onboardingDone: true,
        status: { id: StatusEnum.active, name: 'Active' },
      }),
    );

    // `assignedBy` is null: created out-of-band by an operator, not granted
    // by another administrator through the UI.
    await userRoles.setRole(created.id, RoleEnum.admin, null);

    const [check]: {
      provider: string | null;
      hasPassword: boolean;
      statusId: number | null;
      roleName: string | null;
      userRoleId: number | null;
    }[] = await dataSource.query(
      `SELECT u."provider",
              u."password" IS NOT NULL AS "hasPassword",
              u."status_id" AS "statusId",
              u."role_id"   AS "userRoleId",
              r."name"      AS "roleName"
         FROM "user" u
         LEFT JOIN "user_role" ur ON ur."user_id" = u."id"
         LEFT JOIN "role" r ON r."id" = ur."role_id"
        WHERE u."id" = $1`,
      [created.id],
    );

    // Everything `checkEmailLogin` will demand, asserted here rather than
    // discovered at the login screen.
    const problems = [
      check?.provider !== 'email' &&
        `provider is ${check?.provider}, not email`,
      !check?.hasPassword && 'no password stored',
      check?.statusId === StatusEnum.deactivated && 'account is deactivated',
      check?.roleName !== 'Admin' &&
        `user_role is ${check?.roleName ?? 'none'}`,
      check?.userRoleId !== RoleEnum.admin &&
        `user.role_id is ${check?.userRoleId ?? 'null'}`,
    ].filter(Boolean);

    if (problems.length > 0) {
      console.error(`Created, but not usable: ${problems.join('; ')}.`);
      process.exitCode = 1;
      return;
    }

    console.log(
      `\n  Created ${email} (id ${created.id}) as Admin.\n` +
        '  Sign in at /sign-in with that email and the password you just set.\n' +
        '  The password was not written to the logs, the shell history or the database in clear text.\n',
    );
  } finally {
    await app.close();
  }
};

void run();
