import { PermissionsService } from '../permissions/permissions.service';
import { Permission } from '../permissions/domain/permission';

import { RolesService } from '../roles/roles.service';
import { Role } from '../roles/domain/role';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateRolePermissionDto } from './dto/create-role-permission.dto';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';
import { RolePermissionRepository } from './infrastructure/persistence/role-permission.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { RolePermission } from './domain/role-permission';

@Injectable()
export class RolePermissionsService {
  constructor(
    private readonly permissionService: PermissionsService,

    private readonly roleService: RolesService,

    // Dependencies here
    private readonly rolePermissionRepository: RolePermissionRepository,
  ) {}

  async create(createRolePermissionDto: CreateRolePermissionDto) {
    // Do not remove comment below.
    // <creating-property />
    const permissionObject = await this.permissionService.findById(
      createRolePermissionDto.permission.id,
    );
    if (!permissionObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          permission: 'notExists',
        },
      });
    }
    const permission = permissionObject;

    const roleObject = await this.roleService.findById(
      createRolePermissionDto.role.id,
    );
    if (!roleObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          role: 'notExists',
        },
      });
    }
    const role = roleObject;

    return this.rolePermissionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      permission,

      role,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.rolePermissionRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: RolePermission['id']) {
    return this.rolePermissionRepository.findById(id);
  }

  findByIds(ids: RolePermission['id'][]) {
    return this.rolePermissionRepository.findByIds(ids);
  }

  async update(
    id: RolePermission['id'],

    updateRolePermissionDto: UpdateRolePermissionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let permission: Permission | undefined = undefined;

    if (updateRolePermissionDto.permission) {
      const permissionObject = await this.permissionService.findById(
        updateRolePermissionDto.permission.id,
      );
      if (!permissionObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            permission: 'notExists',
          },
        });
      }
      permission = permissionObject;
    }

    let role: Role | undefined = undefined;

    if (updateRolePermissionDto.role) {
      const roleObject = await this.roleService.findById(
        updateRolePermissionDto.role.id,
      );
      if (!roleObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            role: 'notExists',
          },
        });
      }
      role = roleObject;
    }

    return this.rolePermissionRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      permission,

      role,
    });
  }

  remove(id: RolePermission['id']) {
    return this.rolePermissionRepository.remove(id);
  }
}
