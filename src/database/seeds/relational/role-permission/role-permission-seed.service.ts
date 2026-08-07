import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermissionEntity } from '../../../../role-permissions/infrastructure/persistence/relational/entities/role-permission.entity';
import { PermissionEntity } from '../../../../permissions/infrastructure/persistence/relational/entities/permission.entity';
import { RoleEnum } from '../../../../roles/roles.enum';

@Injectable()
export class RolePermissionSeedService {
  constructor(
    @InjectRepository(RolePermissionEntity)
    private readonly repository: Repository<RolePermissionEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
  ) {}

  async run() {
    const permissions = await this.permissionRepository.find();

    for (const permission of permissions) {
      const count = await this.repository.count({
        where: {
          role: { id: RoleEnum.superAdmin },
          permission: { id: permission.id },
        },
      });

      if (!count) {
        await this.repository.save(
          this.repository.create({
            role: { id: RoleEnum.superAdmin },
            permission,
          }),
        );
      }
    }
  }
}
