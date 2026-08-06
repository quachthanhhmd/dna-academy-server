import { QuizAttempt } from '../../../../domain/quiz-attempt';

import { LectureMapper } from '../../../../../lectures/infrastructure/persistence/relational/mappers/lecture.mapper';

import { EnrollmentMapper } from '../../../../../enrollments/infrastructure/persistence/relational/mappers/enrollment.mapper';

import { QuizAttemptEntity } from '../entities/quiz-attempt.entity';

export class QuizAttemptMapper {
  static toDomain(raw: QuizAttemptEntity): QuizAttempt {
    const domainEntity = new QuizAttempt();
    domainEntity.submittedAt = raw.submittedAt;

    domainEntity.passed = raw.passed;

    domainEntity.score = raw.score;

    if (raw.lecture) {
      domainEntity.lecture = LectureMapper.toDomain(raw.lecture);
    }

    if (raw.enrollment) {
      domainEntity.enrollment = EnrollmentMapper.toDomain(raw.enrollment);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: QuizAttempt): QuizAttemptEntity {
    const persistenceEntity = new QuizAttemptEntity();
    persistenceEntity.submittedAt = domainEntity.submittedAt;

    persistenceEntity.passed = domainEntity.passed;

    persistenceEntity.score = domainEntity.score;

    if (domainEntity.lecture) {
      persistenceEntity.lecture = LectureMapper.toPersistence(
        domainEntity.lecture,
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
