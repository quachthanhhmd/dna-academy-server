import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermissionEntity } from '../../../../role-permissions/infrastructure/persistence/relational/entities/role-permission.entity';
import { PermissionEntity } from '../../../../permissions/infrastructure/persistence/relational/entities/permission.entity';
import { RoleEnum } from '../../../../roles/roles.enum';
import { INSTRUCTOR_PERMISSIONS } from '../../../../authorization/authorization.constants';

/**
 * Permission model §0.3: Admin holds every permission, Instructor its three,
 * User none.
 *
 * Only ever adds. A grant an operator revoked from Instructor through
 * `/admin/roles` comes back on the next boot, which is the price of having the
 * built-in role mean the same thing on every environment; Admin is meant to
 * hold everything, so there is nothing to revoke there.
 */
@Injectable()
export class RolePermissionSeedService {
  constructor(
    @InjectRepository(RolePermissionEntity)
    private readonly repository: Repository<RolePermissionEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
  ) {}

  async run() {
    const permissions = await this.permissionRepository.find({
      relations: { module: true },
    });

    for (const permission of permissions) {
      await this.grant(RoleEnum.admin, permission);
    }

    for (const { module, action } of INSTRUCTOR_PERMISSIONS) {
      const permission = permissions.find(
        (p) => p.module?.name === module && p.action === action,
      );

      if (permission) {
        await this.grant(RoleEnum.instructor, permission);
      }
    }
  }

  private async grant(roleId: RoleEnum, permission: PermissionEntity) {
    const count = await this.repository.count({
      where: { role: { id: roleId }, permission: { id: permission.id } },
    });

    if (!count) {
      await this.repository.save(
        this.repository.create({ role: { id: roleId }, permission }),
      );
    }
  }
}
