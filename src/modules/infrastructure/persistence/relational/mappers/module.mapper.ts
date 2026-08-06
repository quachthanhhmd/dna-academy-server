import { Module } from '../../../../domain/module';

import { ModuleEntity } from '../entities/module.entity';

export class ModuleMapper {
  static toDomain(raw: ModuleEntity): Module {
    const domainEntity = new Module();
    domainEntity.label = raw.label;

    domainEntity.name = raw.name;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Module): ModuleEntity {
    const persistenceEntity = new ModuleEntity();
    persistenceEntity.label = domainEntity.label;

    persistenceEntity.name = domainEntity.name;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
