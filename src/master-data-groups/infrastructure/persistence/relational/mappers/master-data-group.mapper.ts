import { MasterDataGroup } from '../../../../domain/master-data-group';
import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { MasterDataGroupEntity } from '../entities/master-data-group.entity';

export class MasterDataGroupMapper {
  static toDomain(raw: MasterDataGroupEntity): MasterDataGroup {
    const domainEntity = new MasterDataGroup();
    if (raw.createdBy) {
      domainEntity.createdBy = UserMapper.toDomain(raw.createdBy);
    } else if (raw.createdBy === null) {
      domainEntity.createdBy = null;
    }

    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.isActive = raw.isActive;

    domainEntity.description = raw.description;

    domainEntity.name = raw.name;

    domainEntity.groupKey = raw.groupKey;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: MasterDataGroup): MasterDataGroupEntity {
    const persistenceEntity = new MasterDataGroupEntity();
    if (domainEntity.createdBy) {
      persistenceEntity.createdBy = UserMapper.toPersistence(
        domainEntity.createdBy,
      );
    } else if (domainEntity.createdBy === null) {
      persistenceEntity.createdBy = null;
    }

    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.isActive = domainEntity.isActive;

    persistenceEntity.description = domainEntity.description;

    persistenceEntity.name = domainEntity.name;

    persistenceEntity.groupKey = domainEntity.groupKey;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
