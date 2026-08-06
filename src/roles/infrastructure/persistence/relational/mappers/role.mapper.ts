import { Role } from '../../../../domain/role';
import { RoleEntity } from '../entities/role.entity';

export class RoleMapper {
  static toDomain(raw: RoleEntity): Role {
    const domainEntity = new Role();
    domainEntity.id = raw.id;
    domainEntity.name = raw.name;
    domainEntity.description = raw.description;
    domainEntity.isActive = raw.isActive;

    return domainEntity;
  }

  static toPersistence(domainEntity: Role): RoleEntity {
    const persistenceEntity = new RoleEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.name = domainEntity.name;
    persistenceEntity.description = domainEntity.description;
    persistenceEntity.isActive = domainEntity.isActive;

    return persistenceEntity;
  }
}
