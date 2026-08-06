import { UserRole } from '../../../../domain/user-role';

import { RoleMapper } from '../../../../../roles/infrastructure/persistence/relational/mappers/role.mapper';

import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { UserRoleEntity } from '../entities/user-role.entity';

export class UserRoleMapper {
  static toDomain(raw: UserRoleEntity): UserRole {
    const domainEntity = new UserRole();
    if (raw.assignedBy) {
      domainEntity.assignedBy = UserMapper.toDomain(raw.assignedBy);
    } else if (raw.assignedBy === null) {
      domainEntity.assignedBy = null;
    }

    domainEntity.assignedAt = raw.assignedAt;

    if (raw.role) {
      domainEntity.role = RoleMapper.toDomain(raw.role);
    }

    if (raw.user) {
      domainEntity.user = UserMapper.toDomain(raw.user);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: UserRole): UserRoleEntity {
    const persistenceEntity = new UserRoleEntity();
    if (domainEntity.assignedBy) {
      persistenceEntity.assignedBy = UserMapper.toPersistence(
        domainEntity.assignedBy,
      );
    } else if (domainEntity.assignedBy === null) {
      persistenceEntity.assignedBy = null;
    }

    persistenceEntity.assignedAt = domainEntity.assignedAt;

    if (domainEntity.role) {
      persistenceEntity.role = RoleMapper.toPersistence(domainEntity.role);
    }

    if (domainEntity.user) {
      persistenceEntity.user = UserMapper.toPersistence(domainEntity.user);
    }

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
