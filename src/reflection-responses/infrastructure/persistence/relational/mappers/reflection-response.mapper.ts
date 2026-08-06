import { ReflectionResponse } from '../../../../domain/reflection-response';

import { ReflectionQuestionMapper } from '../../../../../reflection-questions/infrastructure/persistence/relational/mappers/reflection-question.mapper';

import { EnrollmentMapper } from '../../../../../enrollments/infrastructure/persistence/relational/mappers/enrollment.mapper';

import { ReflectionResponseEntity } from '../entities/reflection-response.entity';

export class ReflectionResponseMapper {
  static toDomain(raw: ReflectionResponseEntity): ReflectionResponse {
    const domainEntity = new ReflectionResponse();
    domainEntity.submittedAt = raw.submittedAt;

    domainEntity.responseText = raw.responseText;

    if (raw.question) {
      domainEntity.question = ReflectionQuestionMapper.toDomain(raw.question);
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
    domainEntity: ReflectionResponse,
  ): ReflectionResponseEntity {
    const persistenceEntity = new ReflectionResponseEntity();
    persistenceEntity.submittedAt = domainEntity.submittedAt;

    persistenceEntity.responseText = domainEntity.responseText;

    if (domainEntity.question) {
      persistenceEntity.question = ReflectionQuestionMapper.toPersistence(
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
