import { MediaFileEntity } from '../../../../../media-files/infrastructure/persistence/relational/entities/media-file.entity';

import { FileMapper } from '../../../../../files/infrastructure/persistence/relational/mappers/file.mapper';
import { Role } from '../../../../../roles/domain/role';
import { RoleEntity } from '../../../../../roles/infrastructure/persistence/relational/entities/role.entity';
import { Status } from '../../../../../statuses/domain/status';
import { StatusEntity } from '../../../../../statuses/infrastructure/persistence/relational/entities/status.entity';
import { User } from '../../../../domain/user';
import { UserEntity } from '../entities/user.entity';

export class UserMapper {
  static toDomain(raw: UserEntity): User {
    const domainEntity = new User();
    domainEntity.locale = raw.locale;

    domainEntity.onboardingDone = raw.onboardingDone;

    domainEntity.age = raw.age;

    domainEntity.dateOfBirth = raw.dateOfBirth;

    domainEntity.profilePictureUrl = raw.profilePictureUrl;

    domainEntity.emailVerified = raw.emailVerified;

    domainEntity.fullName = raw.fullName;

    domainEntity.id = raw.id;
    domainEntity.email = raw.email;
    domainEntity.password = raw.password;
    domainEntity.provider = raw.provider;
    domainEntity.socialId = raw.socialId;
    domainEntity.firstName = raw.firstName;
    domainEntity.lastName = raw.lastName;
    if (raw.photo) {
      domainEntity.photo = FileMapper.toDomain(raw.photo);
    }
    /*
      Mapped field by field, like `photo` above, rather than assigned straight
      across. A TypeORM entity assigned to a domain object reaches the client
      intact: that is where the `__entity: "RoleEntity"` in every user response
      came from, since EntityRelationalHelper stamps it in @AfterLoad.

      The leak today is only the framework's name, but the shape is the real
      problem — any column added to RoleEntity or StatusEntity later would ship
      to every client with nobody reviewing it. Only id and name cross: the
      client reads `role.id` to gate pages and `role.name` as a label fallback,
      and nothing anywhere reads `description` or `isActive` off an embedded
      role.
    */
    if (raw.role) {
      const role = new Role();
      role.id = raw.role.id;
      role.name = raw.role.name;
      domainEntity.role = role;
    } else {
      domainEntity.role = raw.role;
    }

    if (raw.status) {
      const status = new Status();
      status.id = raw.status.id;
      status.name = raw.status.name;
      domainEntity.status = status;
    }
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    domainEntity.deletedAt = raw.deletedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: User): UserEntity {
    let role: RoleEntity | undefined = undefined;

    if (domainEntity.role) {
      role = new RoleEntity();
      role.id = Number(domainEntity.role.id);
    }

    let photo: MediaFileEntity | undefined | null = undefined;

    if (domainEntity.photo) {
      photo = FileMapper.toReference(domainEntity.photo);
    } else if (domainEntity.photo === null) {
      photo = null;
    }

    let status: StatusEntity | undefined = undefined;

    if (domainEntity.status) {
      status = new StatusEntity();
      status.id = Number(domainEntity.status.id);
    }

    const persistenceEntity = new UserEntity();
    persistenceEntity.locale = domainEntity.locale;

    persistenceEntity.onboardingDone = domainEntity.onboardingDone;

    persistenceEntity.age = domainEntity.age;

    persistenceEntity.dateOfBirth = domainEntity.dateOfBirth;

    persistenceEntity.profilePictureUrl = domainEntity.profilePictureUrl;

    persistenceEntity.emailVerified = domainEntity.emailVerified;

    persistenceEntity.fullName = domainEntity.fullName;

    if (domainEntity.id && typeof domainEntity.id === 'number') {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.email = domainEntity.email;
    persistenceEntity.password = domainEntity.password;
    persistenceEntity.provider = domainEntity.provider;
    persistenceEntity.socialId = domainEntity.socialId;
    persistenceEntity.firstName = domainEntity.firstName;
    persistenceEntity.lastName = domainEntity.lastName;
    persistenceEntity.photo = photo;
    persistenceEntity.role = role;
    persistenceEntity.status = status;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    persistenceEntity.deletedAt = domainEntity.deletedAt;
    return persistenceEntity;
  }
}
