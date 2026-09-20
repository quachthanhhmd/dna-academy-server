import { StudentProfile } from '../../../../domain/student-profile';
import { MasterDataCodeMapper } from '../../../../../master-data-codes/infrastructure/persistence/relational/mappers/master-data-code.mapper';

import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { StudentProfileEntity } from '../entities/student-profile.entity';

export class StudentProfileMapper {
  static toDomain(raw: StudentProfileEntity): StudentProfile {
    const domainEntity = new StudentProfile();
    if (raw.currentStatusCode) {
      domainEntity.currentStatusCode = MasterDataCodeMapper.toDomain(
        raw.currentStatusCode,
      );
    } else if (raw.currentStatusCode === null) {
      domainEntity.currentStatusCode = null;
    }

    domainEntity.customStatus = raw.customStatus;
    domainEntity.currentStatus = domainEntity.currentStatusCode
      ? {
          code: domainEntity.currentStatusCode.code,
          name: domainEntity.currentStatusCode.name,
          customLabel:
            domainEntity.currentStatusCode.code.toLowerCase() === 'other'
              ? (domainEntity.customStatus ?? null)
              : null,
        }
      : null;

    if (raw.educationStageCode) {
      domainEntity.educationStageCode = MasterDataCodeMapper.toDomain(
        raw.educationStageCode,
      );
    } else if (raw.educationStageCode === null) {
      domainEntity.educationStageCode = null;
    }

    if (raw.user) {
      domainEntity.user = UserMapper.toDomain(raw.user);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: StudentProfile): StudentProfileEntity {
    const persistenceEntity = new StudentProfileEntity();
    if (domainEntity.currentStatusCode) {
      persistenceEntity.currentStatusCode = MasterDataCodeMapper.toPersistence(
        domainEntity.currentStatusCode,
      );
    } else if (domainEntity.currentStatusCode === null) {
      persistenceEntity.currentStatusCode = null;
    }

    persistenceEntity.customStatus = domainEntity.customStatus;

    if (domainEntity.educationStageCode) {
      persistenceEntity.educationStageCode = MasterDataCodeMapper.toPersistence(
        domainEntity.educationStageCode,
      );
    } else if (domainEntity.educationStageCode === null) {
      persistenceEntity.educationStageCode = null;
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
