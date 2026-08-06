import { LectureContentReflection } from '../../../../domain/lecture-content-reflection';

import { LectureMapper } from '../../../../../lectures/infrastructure/persistence/relational/mappers/lecture.mapper';

import { LectureContentReflectionEntity } from '../entities/lecture-content-reflection.entity';

export class LectureContentReflectionMapper {
  static toDomain(
    raw: LectureContentReflectionEntity,
  ): LectureContentReflection {
    const domainEntity = new LectureContentReflection();
    domainEntity.minResponseLength = raw.minResponseLength;

    if (raw.lecture) {
      domainEntity.lecture = LectureMapper.toDomain(raw.lecture);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: LectureContentReflection,
  ): LectureContentReflectionEntity {
    const persistenceEntity = new LectureContentReflectionEntity();
    persistenceEntity.minResponseLength = domainEntity.minResponseLength;

    if (domainEntity.lecture) {
      persistenceEntity.lecture = LectureMapper.toPersistence(
        domainEntity.lecture,
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
