import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../../../../roles/roles.enum';
import { UserRoleRepository } from '../../../../user-roles/infrastructure/persistence/user-role.repository';

export const BOOTSTRAP_ADMIN_EMAIL = 'admin@example.com';

/**
 * Makes sure somebody can administer the instance (permission model §2.4).
 *
 * `PermissionGuard` reads `user_role`, so a fresh database has nobody who can
 * pass a `@RequirePermission` check — including the route that assigns
 * roles. When no one holds Admin, the seeded account is given it.
 *
 * The test is "does anyone hold Admin", not "does this account hold it", so
 * handing Admin to a real person and demoting the seed account is respected.
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

    const account = await this.userRepository.findOne({
      where: { email: BOOTSTRAP_ADMIN_EMAIL },
    });

    if (!account) {
      this.logger.warn(
        `No user holds Admin and ${BOOTSTRAP_ADMIN_EMAIL} does not exist — ` +
          'no one can administer this instance. Run the user seed first.',
      );
      return;
    }

    await this.userRoles.setRole(account.id, RoleEnum.admin, null);

    this.logger.log(`Granted Admin to ${BOOTSTRAP_ADMIN_EMAIL}`);
  }
}
