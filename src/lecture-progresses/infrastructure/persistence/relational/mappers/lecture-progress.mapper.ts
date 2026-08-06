import { LectureProgress } from '../../../../domain/lecture-progress';

import { LectureMapper } from '../../../../../lectures/infrastructure/persistence/relational/mappers/lecture.mapper';

import { EnrollmentMapper } from '../../../../../enrollments/infrastructure/persistence/relational/mappers/enrollment.mapper';

import { LectureProgressEntity } from '../entities/lecture-progress.entity';

export class LectureProgressMapper {
  static toDomain(raw: LectureProgressEntity): LectureProgress {
    const domainEntity = new LectureProgress();
    domainEntity.watchDurationSecs = raw.watchDurationSecs;

    domainEntity.completedAt = raw.completedAt;

    domainEntity.startedAt = raw.startedAt;

    domainEntity.status = raw.status;

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

  static toPersistence(domainEntity: LectureProgress): LectureProgressEntity {
    const persistenceEntity = new LectureProgressEntity();
    persistenceEntity.watchDurationSecs = domainEntity.watchDurationSecs;

    persistenceEntity.completedAt = domainEntity.completedAt;

    persistenceEntity.startedAt = domainEntity.startedAt;

    persistenceEntity.status = domainEntity.status;

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
