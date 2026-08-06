import { RolePermission } from '../../../../domain/role-permission';
import { PermissionMapper } from '../../../../../permissions/infrastructure/persistence/relational/mappers/permission.mapper';

import { RoleMapper } from '../../../../../roles/infrastructure/persistence/relational/mappers/role.mapper';

import { RolePermissionEntity } from '../entities/role-permission.entity';

export class RolePermissionMapper {
  static toDomain(raw: RolePermissionEntity): RolePermission {
    const domainEntity = new RolePermission();
    if (raw.permission) {
      domainEntity.permission = PermissionMapper.toDomain(raw.permission);
    }

    if (raw.role) {
      domainEntity.role = RoleMapper.toDomain(raw.role);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: RolePermission): RolePermissionEntity {
    const persistenceEntity = new RolePermissionEntity();
    if (domainEntity.permission) {
      persistenceEntity.permission = PermissionMapper.toPersistence(
        domainEntity.permission,
      );
    }

    if (domainEntity.role) {
      persistenceEntity.role = RoleMapper.toPersistence(domainEntity.role);
    }

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
