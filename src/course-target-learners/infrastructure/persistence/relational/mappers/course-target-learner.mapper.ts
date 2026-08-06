import { CourseTargetLearner } from '../../../../domain/course-target-learner';

import { CourseMapper } from '../../../../../courses/infrastructure/persistence/relational/mappers/course.mapper';

import { CourseTargetLearnerEntity } from '../entities/course-target-learner.entity';

export class CourseTargetLearnerMapper {
  static toDomain(raw: CourseTargetLearnerEntity): CourseTargetLearner {
    const domainEntity = new CourseTargetLearner();
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
    domainEntity: CourseTargetLearner,
  ): CourseTargetLearnerEntity {
    const persistenceEntity = new CourseTargetLearnerEntity();
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
