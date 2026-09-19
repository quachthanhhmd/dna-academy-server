import { AuthorizationService } from '../authorization/authorization.service';
import { RoleEnum } from '../roles/roles.enum';
import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RolesService } from '../roles/roles.service';
import { Role } from '../roles/domain/role';
import { UserRolesService } from '../user-roles/user-roles.service';
import { RolePermissionsService } from '../role-permissions/role-permissions.service';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleWithStatsDto } from './dto/role-with-stats.dto';
import { ModulePermissionsDto } from './dto/module-permissions.dto';

@Injectable()
export class RolesAdminService {
  constructor(
    private readonly rolesService: RolesService,
    private readonly userRolesService: UserRolesService,
    private readonly rolePermissionsService: RolePermissionsService,
    private readonly permissionsService: PermissionsService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async findAllWithStats(): Promise<RoleWithStatsDto[]> {
    const roles = await this.rolesService.findAllWithPagination({
      paginationOptions: { page: 1, limit: 50 },
    });

    return Promise.all(
      roles.map(async (role) => ({
        ...role,
        assignedUsersCount: await this.userRolesService.countByRoleId(role.id),
      })),
    );
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.rolesService.findByName(dto.name);

    if (existing) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        errors: { name: 'roleNameExists' },
      });
    }

    return this.rolesService.create({
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive ?? true,
    });
  }

  async update(id: Role['id'], dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOrThrow(id);

    if (dto.name && dto.name !== role.name) {
      const existing = await this.rolesService.findByName(dto.name);

      if (existing && existing.id !== id) {
        throw new ConflictException({
          status: HttpStatus.CONFLICT,
          errors: { name: 'roleNameExists' },
        });
      }
    }

    const updated = await this.rolesService.update(id, dto);

    return updated ?? role;
  }

  async remove(id: Role['id']): Promise<void> {
    await this.findOrThrow(id);
    this.assertNotBuiltIn(id, BUILT_IN_ROLES);

    const assignedUsersCount = await this.userRolesService.countByRoleId(id);

    if (assignedUsersCount > 0) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        code: 'ROLE_HAS_USERS',
      });
    }

    await this.rolePermissionsService.removeByRoleId(id);
    await this.rolesService.remove(id);
  }

  async getPermissions(roleId: Role['id']): Promise<ModulePermissionsDto[]> {
    await this.findOrThrow(roleId);

    const [allPermissions, rolePermissions] = await Promise.all([
      this.permissionsService.findAll(),
      this.rolePermissionsService.findByRoleId(roleId),
    ]);

    const grantedPermissionIds = new Set(
      rolePermissions.map((rolePermission) => rolePermission.permission.id),
    );

    const groupsByModuleId = new Map<string, ModulePermissionsDto>();

    for (const permission of allPermissions) {
      const moduleId = permission.module.id;

      if (!groupsByModuleId.has(moduleId)) {
        groupsByModuleId.set(moduleId, {
          module: permission.module,
          permissions: [],
        });
      }

      groupsByModuleId.get(moduleId)?.permissions.push({
        id: permission.id,
        action: permission.action,
        label: permission.label,
        isGranted: grantedPermissionIds.has(permission.id),
      });
    }

    return Array.from(groupsByModuleId.values());
  }

  async setPermissions(
    roleId: Role['id'],
    permissionIds: string[],
    actorId: number,
  ): Promise<ModulePermissionsDto[]> {
    await this.findOrThrow(roleId);
    // Admin holds every permission by definition (§0.3); editing it could
    // only take access away from everyone who holds it.
    this.assertNotBuiltIn(roleId, [RoleEnum.admin]);

    const foundPermissions =
      await this.permissionsService.findByIds(permissionIds);

    if (foundPermissions.length !== new Set(permissionIds).size) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { permissionIds: 'notExists' },
      });
    }

    await this.assertWithinCaller(actorId, roleId, foundPermissions);

    await this.rolePermissionsService.removeByRoleId(roleId);

    for (const permission of foundPermissions) {
      await this.rolePermissionsService.create({
        role: { id: roleId },
        permission: { id: permission.id },
      });
    }

    return this.getPermissions(roleId);
  }

  private async findOrThrow(id: Role['id']): Promise<Role> {
    const role = await this.rolesService.findById(id);

    if (!role) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'roleNotFound',
      });
    }

    return role;
  }

  private assertNotBuiltIn(roleId: Role['id'], protectedIds: number[]): void {
    if (protectedIds.includes(roleId)) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        error: 'built_in_role',
      });
    }
  }

  /**
   * A role may only be edited by someone holding every permission it has now
   * and every permission it will have — otherwise `roles:edit` on a custom
   * role grants its holder anything, starting with their own role.
   */
  private async assertWithinCaller(
    actorId: number,
    roleId: Role['id'],
    granted: { id: string }[],
  ): Promise<void> {
    const [caller, current, all] = await Promise.all([
      this.authorizationService.permissionsOf(actorId),
      this.authorizationService.permissionsOfRole(roleId),
      this.permissionsService.findAll(),
    ]);
    const keyOf = new Map(
      all.map((p) => [p.id, `${p.module?.name}:${p.action}`]),
    );
    const next = granted.map((p) => keyOf.get(p.id));
    const callerHas = new Set(caller);

    if (![...current, ...next].every((key) => key && callerHas.has(key))) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        code: 'ROLE_EXCEEDS_CALLER',
      });
    }
  }
}

/** Roles the code keys on (RoleEnum); deleting one would break it. */
const BUILT_IN_ROLES: number[] = [
  RoleEnum.admin,
  RoleEnum.user,
  RoleEnum.instructor,
];
