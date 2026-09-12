import { LectureContentQuiz } from '../../../../domain/lecture-content-quiz';

import { LectureMapper } from '../../../../../lectures/infrastructure/persistence/relational/mappers/lecture.mapper';

import { LectureContentQuizEntity } from '../entities/lecture-content-quiz.entity';

export class LectureContentQuizMapper {
  static toDomain(raw: LectureContentQuizEntity): LectureContentQuiz {
    const domainEntity = new LectureContentQuiz();
    domainEntity.allowResume = raw.allowResume;

    domainEntity.passingScore = raw.passingScore;

    domainEntity.passThresholdPercent = raw.passThresholdPercent;

    domainEntity.timeLimitSecs = raw.timeLimitSecs;

    domainEntity.instructions = raw.instructions;

    if (raw.lecture) {
      domainEntity.lecture = LectureMapper.toDomain(raw.lecture);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: LectureContentQuiz,
  ): LectureContentQuizEntity {
    const persistenceEntity = new LectureContentQuizEntity();
    persistenceEntity.allowResume = domainEntity.allowResume;

    persistenceEntity.passingScore = domainEntity.passingScore;

    persistenceEntity.passThresholdPercent = domainEntity.passThresholdPercent;

    persistenceEntity.timeLimitSecs = domainEntity.timeLimitSecs;

    persistenceEntity.instructions = domainEntity.instructions;

    if (domainEntity.lecture) {
      persistenceEntity.lecture = LectureMapper.toPersistence(
        domainEntity.lecture,
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
