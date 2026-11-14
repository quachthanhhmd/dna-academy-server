import { LectureRatingResponse } from '../../../../domain/lecture-rating-response';
import { EnrollmentMapper } from '../../../../../enrollments/infrastructure/persistence/relational/mappers/enrollment.mapper';

import { LectureMapper } from '../../../../../lectures/infrastructure/persistence/relational/mappers/lecture.mapper';

import { LectureRatingResponseEntity } from '../entities/lecture-rating-response.entity';

export class LectureRatingResponseMapper {
  static toDomain(raw: LectureRatingResponseEntity): LectureRatingResponse {
    const domainEntity = new LectureRatingResponse();
    if (raw.enrollment) {
      domainEntity.enrollment = EnrollmentMapper.toDomain(raw.enrollment);
    }

    if (raw.lecture) {
      domainEntity.lecture = LectureMapper.toDomain(raw.lecture);
    }

    domainEntity.submittedAt = raw.submittedAt;

    domainEntity.comment = raw.comment;

    domainEntity.rating = raw.rating;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: LectureRatingResponse,
  ): LectureRatingResponseEntity {
    const persistenceEntity = new LectureRatingResponseEntity();
    if (domainEntity.enrollment) {
      persistenceEntity.enrollment = EnrollmentMapper.toPersistence(
        domainEntity.enrollment,
      );
    }

    if (domainEntity.lecture) {
      persistenceEntity.lecture = LectureMapper.toPersistence(
        domainEntity.lecture,
      );
    }

    persistenceEntity.submittedAt = domainEntity.submittedAt;

    persistenceEntity.comment = domainEntity.comment;

    persistenceEntity.rating = domainEntity.rating;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
