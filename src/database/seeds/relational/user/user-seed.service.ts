import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { RoleEnum } from '../../../../roles/roles.enum';
import { StatusEnum } from '../../../../statuses/statuses.enum';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { UserRoleRepository } from '../../../../user-roles/infrastructure/persistence/user-role.repository';

const FIXTURES = [
  {
    email: 'admin@example.com',
    firstName: 'Super',
    lastName: 'Admin',
    role: RoleEnum.admin,
  },
  {
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: RoleEnum.user,
  },
] as const;

/**
 * Allowlist, not a denylist. An unset or misspelled NODE_ENV must fall
 * through to "do not seed" — a deployment that forgets the variable is
 * exactly the case where shipping a published Admin password hurts most.
 */
const ENVIRONMENTS_WITH_FIXTURES = ['development', 'test'];

/**
 * The two development accounts. Each is created once, by email, and gets its
 * role through `setRole` like every other account (permission model §2.5).
 *
 * **Never runs outside development or test.** These fixtures carry a
 * published password (`secret`) and one of them holds Admin, so seeding them
 * into a deployed environment hands anyone who has read this repository — it
 * is a public boilerplate — a full administrator login. The Dockerfile's only
 * CMD was the dev startup script, which ran this unconditionally on every
 * container boot.
 *
 * The rest of `seed:run:relational` still has to run in production: statuses
 * 1/2 (Active/Inactive) exist only here, not in any migration, so a fresh
 * database without them cannot create a single user. That is why the guard
 * lives in this service rather than in the startup script.
 *
 * Real environments bootstrap their first administrator through
 * `AdminBootstrapSeedService`, which only grants a role to an account that
 * already exists and never invents a password.
 */
@Injectable()
export class UserSeedService {
  private readonly logger = new Logger(UserSeedService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
    private readonly userRoles: UserRoleRepository,
  ) {}

  async run() {
    const environment = process.env.NODE_ENV;

    if (!environment || !ENVIRONMENTS_WITH_FIXTURES.includes(environment)) {
      this.logger.warn(
        `Skipping development user fixtures (NODE_ENV=${environment ?? 'unset'}). ` +
          'Grant the first Admin through AdminBootstrapSeedService instead.',
      );
      return;
    }

    for (const fixture of FIXTURES) {
      const exists = await this.repository.count({
        where: { email: fixture.email },
      });

      if (exists) {
        continue;
      }

      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash('secret', salt);

      const user = await this.repository.save(
        this.repository.create({
          firstName: fixture.firstName,
          lastName: fixture.lastName,
          fullName: `${fixture.firstName} ${fixture.lastName}`,
          emailVerified: true,
          onboardingDone: true,
          email: fixture.email,
          password,
          status: {
            id: StatusEnum.active,
            name: 'Active',
          },
        }),
      );

      await this.userRoles.setRole(user.id, fixture.role, null);
    }
  }
}
