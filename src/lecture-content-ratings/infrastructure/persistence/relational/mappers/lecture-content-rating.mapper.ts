import { LectureContentRating } from '../../../../domain/lecture-content-rating';
import { LectureMapper } from '../../../../../lectures/infrastructure/persistence/relational/mappers/lecture.mapper';

import { LectureContentRatingEntity } from '../entities/lecture-content-rating.entity';

export class LectureContentRatingMapper {
  static toDomain(raw: LectureContentRatingEntity): LectureContentRating {
    const domainEntity = new LectureContentRating();
    if (raw.lecture) {
      domainEntity.lecture = LectureMapper.toDomain(raw.lecture);
    }

    domainEntity.allowComment = raw.allowComment;

    domainEntity.labelMax = raw.labelMax;

    domainEntity.labelMin = raw.labelMin;

    domainEntity.prompt = raw.prompt;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: LectureContentRating,
  ): LectureContentRatingEntity {
    const persistenceEntity = new LectureContentRatingEntity();
    if (domainEntity.lecture) {
      persistenceEntity.lecture = LectureMapper.toPersistence(
        domainEntity.lecture,
      );
    }

    persistenceEntity.allowComment = domainEntity.allowComment;

    persistenceEntity.labelMax = domainEntity.labelMax;

    persistenceEntity.labelMin = domainEntity.labelMin;

    persistenceEntity.prompt = domainEntity.prompt;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
