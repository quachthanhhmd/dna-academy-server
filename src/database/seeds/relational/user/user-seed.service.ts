import { Injectable } from '@nestjs/common';
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
 * The two development accounts. Each is created once, by email, and gets its
 * role through `setRole` like every other account (permission model §2.5).
 */
@Injectable()
export class UserSeedService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
    private readonly userRoles: UserRoleRepository,
  ) {}

  async run() {
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
