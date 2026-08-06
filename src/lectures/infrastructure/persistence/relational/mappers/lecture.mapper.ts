import { Lecture } from '../../../../domain/lecture';

import { SectionMapper } from '../../../../../sections/infrastructure/persistence/relational/mappers/section.mapper';

import { LectureEntity } from '../entities/lecture.entity';

export class LectureMapper {
  static toDomain(raw: LectureEntity): Lecture {
    const domainEntity = new Lecture();
    domainEntity.status = raw.status;

    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.requiresCompletion = raw.requiresCompletion;

    domainEntity.isPreview = raw.isPreview;

    domainEntity.durationSecs = raw.durationSecs;

    domainEntity.lectureType = raw.lectureType;

    domainEntity.description = raw.description;

    domainEntity.title = raw.title;

    if (raw.section) {
      domainEntity.section = SectionMapper.toDomain(raw.section);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Lecture): LectureEntity {
    const persistenceEntity = new LectureEntity();
    persistenceEntity.status = domainEntity.status;

    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.requiresCompletion = domainEntity.requiresCompletion;

    persistenceEntity.isPreview = domainEntity.isPreview;

    persistenceEntity.durationSecs = domainEntity.durationSecs;

    persistenceEntity.lectureType = domainEntity.lectureType;

    persistenceEntity.description = domainEntity.description;

    persistenceEntity.title = domainEntity.title;

    if (domainEntity.section) {
      persistenceEntity.section = SectionMapper.toPersistence(
        domainEntity.section,
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
