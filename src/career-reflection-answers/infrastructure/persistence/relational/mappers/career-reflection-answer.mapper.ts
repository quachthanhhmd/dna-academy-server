import { CareerReflectionAnswer } from '../../../../domain/career-reflection-answer';

import { CareerReflectionQuestionMapper } from '../../../../../career-reflection-questions/infrastructure/persistence/relational/mappers/career-reflection-question.mapper';

import { EnrollmentMapper } from '../../../../../enrollments/infrastructure/persistence/relational/mappers/enrollment.mapper';

import { CareerReflectionAnswerEntity } from '../entities/career-reflection-answer.entity';

export class CareerReflectionAnswerMapper {
  static toDomain(raw: CareerReflectionAnswerEntity): CareerReflectionAnswer {
    const domainEntity = new CareerReflectionAnswer();
    domainEntity.submittedAt = raw.submittedAt;

    domainEntity.textAnswer = raw.textAnswer;

    domainEntity.ratingAnswer = raw.ratingAnswer;

    if (raw.question) {
      domainEntity.question = CareerReflectionQuestionMapper.toDomain(
        raw.question,
      );
    }

    if (raw.enrollment) {
      domainEntity.enrollment = EnrollmentMapper.toDomain(raw.enrollment);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: CareerReflectionAnswer,
  ): CareerReflectionAnswerEntity {
    const persistenceEntity = new CareerReflectionAnswerEntity();
    persistenceEntity.submittedAt = domainEntity.submittedAt;

    persistenceEntity.textAnswer = domainEntity.textAnswer;

    persistenceEntity.ratingAnswer = domainEntity.ratingAnswer;

    if (domainEntity.question) {
      persistenceEntity.question = CareerReflectionQuestionMapper.toPersistence(
        domainEntity.question,
      );
    }

    if (domainEntity.enrollment) {
      persistenceEntity.enrollment = EnrollmentMapper.toPersistence(
        domainEntity.enrollment,
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
