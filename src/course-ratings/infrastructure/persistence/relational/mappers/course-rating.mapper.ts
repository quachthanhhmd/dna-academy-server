import { CourseRating } from '../../../../domain/course-rating';

import { CourseMapper } from '../../../../../courses/infrastructure/persistence/relational/mappers/course.mapper';

import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { EnrollmentMapper } from '../../../../../enrollments/infrastructure/persistence/relational/mappers/enrollment.mapper';

import { CourseRatingEntity } from '../entities/course-rating.entity';

export class CourseRatingMapper {
  static toDomain(raw: CourseRatingEntity): CourseRating {
    const domainEntity = new CourseRating();
    domainEntity.submittedAt = raw.submittedAt;

    domainEntity.reviewStatus = raw.reviewStatus;

    domainEntity.reviewText = raw.reviewText;

    domainEntity.rating = raw.rating;

    if (raw.course) {
      domainEntity.course = CourseMapper.toDomain(raw.course);
    }

    if (raw.student) {
      domainEntity.student = UserMapper.toDomain(raw.student);
    }

    if (raw.enrollment) {
      domainEntity.enrollment = EnrollmentMapper.toDomain(raw.enrollment);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: CourseRating): CourseRatingEntity {
    const persistenceEntity = new CourseRatingEntity();
    persistenceEntity.submittedAt = domainEntity.submittedAt;

    persistenceEntity.reviewStatus = domainEntity.reviewStatus;

    persistenceEntity.reviewText = domainEntity.reviewText;

    persistenceEntity.rating = domainEntity.rating;

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
