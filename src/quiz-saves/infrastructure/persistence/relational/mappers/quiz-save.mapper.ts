import { QuizSave } from '../../../../domain/quiz-save';

import { LectureMapper } from '../../../../../lectures/infrastructure/persistence/relational/mappers/lecture.mapper';

import { EnrollmentMapper } from '../../../../../enrollments/infrastructure/persistence/relational/mappers/enrollment.mapper';

import { QuizSaveEntity } from '../entities/quiz-save.entity';

export class QuizSaveMapper {
  static toDomain(raw: QuizSaveEntity): QuizSave {
    const domainEntity = new QuizSave();
    domainEntity.savedAt = raw.savedAt;

    domainEntity.answersJson = raw.answersJson;

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

  static toPersistence(domainEntity: QuizSave): QuizSaveEntity {
    const persistenceEntity = new QuizSaveEntity();
    persistenceEntity.savedAt = domainEntity.savedAt;

    persistenceEntity.answersJson = domainEntity.answersJson;

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
