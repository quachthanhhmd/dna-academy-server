import { StudentCareerInterest } from '../../../../domain/student-career-interest';

import { MasterDataCodeMapper } from '../../../../../master-data-codes/infrastructure/persistence/relational/mappers/master-data-code.mapper';

import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { StudentCareerInterestEntity } from '../entities/student-career-interest.entity';

export class StudentCareerInterestMapper {
  static toDomain(raw: StudentCareerInterestEntity): StudentCareerInterest {
    const domainEntity = new StudentCareerInterest();
    domainEntity.customInterest = raw.customInterest;

    if (raw.careerInterest) {
      domainEntity.careerInterest = MasterDataCodeMapper.toDomain(
        raw.careerInterest,
      );
    }

    if (raw.user) {
      domainEntity.user = UserMapper.toDomain(raw.user);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: StudentCareerInterest,
  ): StudentCareerInterestEntity {
    const persistenceEntity = new StudentCareerInterestEntity();
    persistenceEntity.customInterest = domainEntity.customInterest;

    if (domainEntity.careerInterest) {
      persistenceEntity.careerInterest = MasterDataCodeMapper.toPersistence(
        domainEntity.careerInterest,
      );
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
