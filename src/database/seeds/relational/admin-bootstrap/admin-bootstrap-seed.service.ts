import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../../../../roles/roles.enum';
import { UserRoleRepository } from '../../../../user-roles/infrastructure/persistence/user-role.repository';

/**
 * The development fixture, used when `ADMIN_BOOTSTRAP_EMAIL` is unset. In
 * production `UserSeedService` never creates it, so leaving the variable
 * unset there means this service finds nothing and only warns.
 */
export const DEFAULT_BOOTSTRAP_ADMIN_EMAIL = 'admin@example.com';

/**
 * Read at call time, not at module load: `SeedModule` populates `process.env`
 * from the env file through `ConfigModule`, which runs after this module is
 * imported. The same reason `UserSeedService` reads `NODE_ENV` inside `run`.
 */
export const bootstrapAdminEmail = (): string =>
  process.env.ADMIN_BOOTSTRAP_EMAIL?.trim() || DEFAULT_BOOTSTRAP_ADMIN_EMAIL;

/**
 * Makes sure somebody can administer the instance (permission model §2.4).
 *
 * `PermissionGuard` reads `user_role`, so a fresh database has nobody who can
 * pass a `@RequirePermission` check — including the route that assigns
 * roles. When no one holds Admin, the named account is given it.
 *
 * The test is "does anyone hold Admin", not "does this account hold it", so
 * handing Admin to a real person and demoting the seed account is respected.
 *
 * It only ever grants a role to an account that **already exists** — it never
 * invents a password. On production the deploy order is therefore: bring the
 * stack up, register `ADMIN_BOOTSTRAP_EMAIL` through the UI, then re-run the
 * seed. Re-running is safe: once anyone holds Admin this returns immediately.
 */
@Injectable()
export class AdminBootstrapSeedService {
  private readonly logger = new Logger(AdminBootstrapSeedService.name);

  constructor(
    private readonly userRoles: UserRoleRepository,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async run(): Promise<void> {
    if ((await this.userRoles.countByRoleId(RoleEnum.admin)) > 0) {
      return;
    }

    const email = bootstrapAdminEmail();

    const account = await this.userRepository.findOne({
      where: { email },
    });

    if (!account) {
      this.logger.warn(
        `No user holds Admin and ${email} does not exist — no one can ` +
          'administer this instance. Register that account, then re-run the ' +
          'seed. (Set ADMIN_BOOTSTRAP_EMAIL to name a different account.)',
      );
      return;
    }

    await this.userRoles.setRole(account.id, RoleEnum.admin, null);

    this.logger.log(`Granted Admin to ${email}`);
  }
}
