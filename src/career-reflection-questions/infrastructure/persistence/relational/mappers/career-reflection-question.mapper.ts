import { CareerReflectionQuestion } from '../../../../domain/career-reflection-question';

import { CourseMapper } from '../../../../../courses/infrastructure/persistence/relational/mappers/course.mapper';

import { CareerReflectionQuestionEntity } from '../entities/career-reflection-question.entity';

export class CareerReflectionQuestionMapper {
  static toDomain(
    raw: CareerReflectionQuestionEntity,
  ): CareerReflectionQuestion {
    const domainEntity = new CareerReflectionQuestion();
    domainEntity.isActive = raw.isActive;

    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.questionText = raw.questionText;

    if (raw.course) {
      domainEntity.course = CourseMapper.toDomain(raw.course);
    } else if (raw.course === null) {
      domainEntity.course = null;
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: CareerReflectionQuestion,
  ): CareerReflectionQuestionEntity {
    const persistenceEntity = new CareerReflectionQuestionEntity();
    persistenceEntity.isActive = domainEntity.isActive;

    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.questionText = domainEntity.questionText;

    if (domainEntity.course) {
      persistenceEntity.course = CourseMapper.toPersistence(
        domainEntity.course,
      );
    } else if (domainEntity.course === null) {
      persistenceEntity.course = null;
    }

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
