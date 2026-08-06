import { Permission } from '../../../../domain/permission';

import { ModuleMapper } from '../../../../../modules/infrastructure/persistence/relational/mappers/module.mapper';

import { PermissionEntity } from '../entities/permission.entity';

export class PermissionMapper {
  static toDomain(raw: PermissionEntity): Permission {
    const domainEntity = new Permission();
    domainEntity.label = raw.label;

    domainEntity.action = raw.action;

    if (raw.module) {
      domainEntity.module = ModuleMapper.toDomain(raw.module);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Permission): PermissionEntity {
    const persistenceEntity = new PermissionEntity();
    persistenceEntity.label = domainEntity.label;

    persistenceEntity.action = domainEntity.action;

    if (domainEntity.module) {
      persistenceEntity.module = ModuleMapper.toPersistence(
        domainEntity.module,
      );
    }

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
