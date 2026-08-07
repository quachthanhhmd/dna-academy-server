import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { Role } from '../roles/domain/role';
import { User } from '../users/domain/user';
import { UserRolesService } from '../user-roles/user-roles.service';

@Injectable()
export class UserRolesAdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly userRolesService: UserRolesService,
  ) {}

  async findRolesForUser(userId: User['id']): Promise<Role[]> {
    await this.findUserOrThrow(userId);

    const userRoles = await this.userRolesService.findByUserId(userId);

    return userRoles.map((userRole) => userRole.role);
  }

  async setRolesForUser(
    userId: User['id'],
    roleIds: Role['id'][],
    assignedByUserId: User['id'],
  ): Promise<Role[]> {
    await this.findUserOrThrow(userId);

    const foundRoles = await this.rolesService.findByIds(roleIds);

    if (foundRoles.length !== new Set(roleIds).size) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { roleIds: 'notExists' },
      });
    }

    await this.userRolesService.removeByUserId(userId);

    for (const role of foundRoles) {
      await this.userRolesService.create({
        user: { id: userId },
        role: { id: role.id },
        assignedBy: { id: assignedByUserId },
        assignedAt: new Date(),
      });
    }

    return this.findRolesForUser(userId);
  }

  private async findUserOrThrow(userId: User['id']): Promise<User> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'userNotFound',
      });
    }

    return user;
  }
}
