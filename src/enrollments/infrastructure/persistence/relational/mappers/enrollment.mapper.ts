import { Enrollment } from '../../../../domain/enrollment';
import { LectureMapper } from '../../../../../lectures/infrastructure/persistence/relational/mappers/lecture.mapper';

import { CourseMapper } from '../../../../../courses/infrastructure/persistence/relational/mappers/course.mapper';

import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { EnrollmentEntity } from '../entities/enrollment.entity';

export class EnrollmentMapper {
  static toDomain(raw: EnrollmentEntity): Enrollment {
    const domainEntity = new Enrollment();
    if (raw.lastLecture) {
      domainEntity.lastLecture = LectureMapper.toDomain(raw.lastLecture);
    } else if (raw.lastLecture === null) {
      domainEntity.lastLecture = null;
    }

    domainEntity.lastAccessedAt = raw.lastAccessedAt;

    domainEntity.progressPct = raw.progressPct;

    domainEntity.completedAt = raw.completedAt;

    domainEntity.startedAt = raw.startedAt;

    domainEntity.enrollmentSource = raw.enrollmentSource;

    domainEntity.enrollmentDate = raw.enrollmentDate;

    domainEntity.status = raw.status;

    if (raw.course) {
      domainEntity.course = CourseMapper.toDomain(raw.course);
    }

    if (raw.student) {
      domainEntity.student = UserMapper.toDomain(raw.student);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Enrollment): EnrollmentEntity {
    const persistenceEntity = new EnrollmentEntity();
    if (domainEntity.lastLecture) {
      persistenceEntity.lastLecture = LectureMapper.toPersistence(
        domainEntity.lastLecture,
      );
    } else if (domainEntity.lastLecture === null) {
      persistenceEntity.lastLecture = null;
    }

    persistenceEntity.lastAccessedAt = domainEntity.lastAccessedAt;

    persistenceEntity.progressPct = domainEntity.progressPct;

    persistenceEntity.completedAt = domainEntity.completedAt;

    persistenceEntity.startedAt = domainEntity.startedAt;

    persistenceEntity.enrollmentSource = domainEntity.enrollmentSource;

    persistenceEntity.enrollmentDate = domainEntity.enrollmentDate;

    persistenceEntity.status = domainEntity.status;

    if (domainEntity.course) {
      persistenceEntity.course = CourseMapper.toPersistence(
        domainEntity.course,
      );
    }

    if (domainEntity.student) {
      persistenceEntity.student = UserMapper.toPersistence(
        domainEntity.student,
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
