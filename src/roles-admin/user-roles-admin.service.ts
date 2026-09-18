import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { Role } from '../roles/domain/role';
import { User } from '../users/domain/user';
import { UserRolesService } from '../user-roles/user-roles.service';

@Injectable()
export class UserRolesAdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly userRolesService: UserRolesService,
  ) {}

  async findRolesForUser(userId: User['id']): Promise<Role[]> {
    await this.findUserOrThrow(userId);

    const userRoles = await this.userRolesService.findByUserId(userId);

    return userRoles.map((userRole) => userRole.role);
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
