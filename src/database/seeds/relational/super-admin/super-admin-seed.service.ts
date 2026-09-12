import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRoleEntity } from '../../../../user-roles/infrastructure/persistence/relational/entities/user-role.entity';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../../../../roles/roles.enum';

export const BOOTSTRAP_ADMIN_EMAIL = 'admin@example.com';

/**
 * Grants the seeded admin the Super Admin role in `user_role`.
 *
 * `PermissionGuard` reads `user_role`, not the legacy `user.roleId`, so
 * without this row a fresh database has nobody who can pass a
 * `@RequirePermission` check — including the route that assigns roles. That
 * left `POST /user-roles` as the only way in, which is exactly the
 * self-service escalation this seed exists to make unnecessary.
 *
 * The guard is "does anyone hold Super Admin", so once the role has been moved
 * to a real account this seed stays out of the way.
 */
@Injectable()
export class SuperAdminSeedService {
  private readonly logger = new Logger(SuperAdminSeedService.name);

  constructor(
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async run(): Promise<void> {
    const holders = await this.userRoleRepository.count({
      where: { role: { id: RoleEnum.superAdmin } },
    });

    if (holders > 0) {
      return;
    }

    const admin = await this.userRepository.findOne({
      where: { email: BOOTSTRAP_ADMIN_EMAIL },
    });

    if (!admin) {
      this.logger.warn(
        `No user holds Super Admin and ${BOOTSTRAP_ADMIN_EMAIL} does not exist — ` +
          'no one can administer this instance. Run the user seed first.',
      );
      return;
    }

    await this.userRoleRepository.save(
      this.userRoleRepository.create({
        user: { id: admin.id } as UserEntity,
        role: { id: RoleEnum.superAdmin } as never,
        assignedAt: new Date(),
        assignedBy: null,
      }),
    );

    this.logger.log(`Granted Super Admin to ${BOOTSTRAP_ADMIN_EMAIL}`);
  }
}
