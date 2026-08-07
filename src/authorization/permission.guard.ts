import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRolesService } from '../user-roles/user-roles.service';
import { RolePermissionsService } from '../role-permissions/role-permissions.service';
import {
  PERMISSION_METADATA_KEY,
  RequiredPermission,
} from './authorization.constants';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userRolesService: UserRolesService,
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<
      RequiredPermission | undefined
    >(PERMISSION_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        required,
      });
    }

    const userRoles = await this.userRolesService.findByUserId(userId);

    for (const userRole of userRoles) {
      const rolePermissions = await this.rolePermissionsService.findByRoleId(
        userRole.role.id,
      );

      const isGranted = rolePermissions.some(
        (rolePermission) =>
          rolePermission.permission.module.name === required.module &&
          rolePermission.permission.action === required.action,
      );

      if (isGranted) {
        return true;
      }
    }

    throw new ForbiddenException({
      code: 'PERMISSION_DENIED',
      required,
    });
  }
}
