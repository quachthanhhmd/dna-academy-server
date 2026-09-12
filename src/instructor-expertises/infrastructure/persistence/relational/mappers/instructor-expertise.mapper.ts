import { InstructorExpertise } from '../../../../domain/instructor-expertise';
import { MasterDataCodeMapper } from '../../../../../master-data-codes/infrastructure/persistence/relational/mappers/master-data-code.mapper';
import { InstructorMapper } from '../../../../../instructors/infrastructure/persistence/relational/mappers/instructor.mapper';

import { InstructorExpertiseEntity } from '../entities/instructor-expertise.entity';

export class InstructorExpertiseMapper {
  static toDomain(raw: InstructorExpertiseEntity): InstructorExpertise {
    const domainEntity = new InstructorExpertise();

    if (raw.instructor) {
      domainEntity.instructor = InstructorMapper.toDomain(raw.instructor);
    }

    if (raw.expertiseCode) {
      domainEntity.expertiseCode = MasterDataCodeMapper.toDomain(
        raw.expertiseCode,
      );
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: InstructorExpertise,
  ): InstructorExpertiseEntity {
    const persistenceEntity = new InstructorExpertiseEntity();

    if (domainEntity.instructor) {
      persistenceEntity.instructor = InstructorMapper.toPersistence(
        domainEntity.instructor,
      );
    }

    if (domainEntity.expertiseCode) {
      persistenceEntity.expertiseCode = MasterDataCodeMapper.toPersistence(
        domainEntity.expertiseCode,
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
