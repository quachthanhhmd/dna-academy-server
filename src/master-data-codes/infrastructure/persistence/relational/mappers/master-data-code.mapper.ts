import { MasterDataCode } from '../../../../domain/master-data-code';
import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { MasterDataGroupMapper } from '../../../../../master-data-groups/infrastructure/persistence/relational/mappers/master-data-group.mapper';

import { MasterDataCodeEntity } from '../entities/master-data-code.entity';

export class MasterDataCodeMapper {
  static toDomain(raw: MasterDataCodeEntity): MasterDataCode {
    const domainEntity = new MasterDataCode();
    if (raw.createdBy) {
      domainEntity.createdBy = UserMapper.toDomain(raw.createdBy);
    } else if (raw.createdBy === null) {
      domainEntity.createdBy = null;
    }

    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.isActive = raw.isActive;

    domainEntity.thumbnailUrl = raw.thumbnailUrl;

    domainEntity.description = raw.description;

    domainEntity.name = raw.name;

    domainEntity.code = raw.code;

    if (raw.group) {
      domainEntity.group = MasterDataGroupMapper.toDomain(raw.group);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: MasterDataCode): MasterDataCodeEntity {
    const persistenceEntity = new MasterDataCodeEntity();
    if (domainEntity.createdBy) {
      persistenceEntity.createdBy = UserMapper.toPersistence(
        domainEntity.createdBy,
      );
    } else if (domainEntity.createdBy === null) {
      persistenceEntity.createdBy = null;
    }

    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.isActive = domainEntity.isActive;

    persistenceEntity.thumbnailUrl = domainEntity.thumbnailUrl;

    persistenceEntity.description = domainEntity.description;

    persistenceEntity.name = domainEntity.name;

    persistenceEntity.code = domainEntity.code;

    if (domainEntity.group) {
      persistenceEntity.group = MasterDataGroupMapper.toPersistence(
        domainEntity.group,
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
