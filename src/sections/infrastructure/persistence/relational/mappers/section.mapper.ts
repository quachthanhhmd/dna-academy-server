import { Section } from '../../../../domain/section';

import { CourseMapper } from '../../../../../courses/infrastructure/persistence/relational/mappers/course.mapper';

import { SectionEntity } from '../entities/section.entity';

export class SectionMapper {
  static toDomain(raw: SectionEntity): Section {
    const domainEntity = new Section();
    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.learningObjective = raw.learningObjective;

    domainEntity.description = raw.description;

    domainEntity.title = raw.title;

    if (raw.course) {
      domainEntity.course = CourseMapper.toDomain(raw.course);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Section): SectionEntity {
    const persistenceEntity = new SectionEntity();
    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.learningObjective = domainEntity.learningObjective;

    persistenceEntity.description = domainEntity.description;

    persistenceEntity.title = domainEntity.title;

    if (domainEntity.course) {
      persistenceEntity.course = CourseMapper.toPersistence(
        domainEntity.course,
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
