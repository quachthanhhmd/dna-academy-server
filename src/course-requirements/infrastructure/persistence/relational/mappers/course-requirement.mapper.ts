import { CourseRequirement } from '../../../../domain/course-requirement';

import { CourseMapper } from '../../../../../courses/infrastructure/persistence/relational/mappers/course.mapper';

import { CourseRequirementEntity } from '../entities/course-requirement.entity';

export class CourseRequirementMapper {
  static toDomain(raw: CourseRequirementEntity): CourseRequirement {
    const domainEntity = new CourseRequirement();
    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.description = raw.description;

    if (raw.course) {
      domainEntity.course = CourseMapper.toDomain(raw.course);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: CourseRequirement,
  ): CourseRequirementEntity {
    const persistenceEntity = new CourseRequirementEntity();
    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.description = domainEntity.description;

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
