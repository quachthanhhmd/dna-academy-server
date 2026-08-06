import { CourseLearningOutcome } from '../../../../domain/course-learning-outcome';

import { CourseMapper } from '../../../../../courses/infrastructure/persistence/relational/mappers/course.mapper';

import { CourseLearningOutcomeEntity } from '../entities/course-learning-outcome.entity';

export class CourseLearningOutcomeMapper {
  static toDomain(raw: CourseLearningOutcomeEntity): CourseLearningOutcome {
    const domainEntity = new CourseLearningOutcome();
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
    domainEntity: CourseLearningOutcome,
  ): CourseLearningOutcomeEntity {
    const persistenceEntity = new CourseLearningOutcomeEntity();
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
