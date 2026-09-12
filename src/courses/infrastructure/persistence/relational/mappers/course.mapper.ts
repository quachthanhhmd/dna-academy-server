import { Course } from '../../../../domain/course';

import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { MasterDataCodeMapper } from '../../../../../master-data-codes/infrastructure/persistence/relational/mappers/master-data-code.mapper';

import { CourseEntity } from '../entities/course.entity';

export class CourseMapper {
  static toDomain(raw: CourseEntity): Course {
    const domainEntity = new Course();
    domainEntity.courseId = raw.courseId;

    if (raw.createdBy) {
      domainEntity.createdBy = UserMapper.toDomain(raw.createdBy);
    } else if (raw.createdBy === null) {
      domainEntity.createdBy = null;
    }

    if (raw.publishedBy) {
      domainEntity.publishedBy = UserMapper.toDomain(raw.publishedBy);
    } else if (raw.publishedBy === null) {
      domainEntity.publishedBy = null;
    }

    domainEntity.publishedAt = raw.publishedAt;

    domainEntity.unpublishedAt = raw.unpublishedAt;

    if (raw.unpublishedBy) {
      domainEntity.unpublishedBy = UserMapper.toDomain(raw.unpublishedBy);
    } else if (raw.unpublishedBy === null) {
      domainEntity.unpublishedBy = null;
    }

    domainEntity.requiresSequentialCompletion =
      raw.requiresSequentialCompletion;

    domainEntity.avgRating = raw.avgRating;

    domainEntity.totalEnrollments = raw.totalEnrollments;

    domainEntity.totalDurationSecs = raw.totalDurationSecs;

    domainEntity.totalLectures = raw.totalLectures;

    domainEntity.totalSections = raw.totalSections;

    if (raw.category) {
      domainEntity.category = MasterDataCodeMapper.toDomain(raw.category);
    } else if (raw.category === null) {
      domainEntity.category = null;
    }

    if (raw.level) {
      domainEntity.level = MasterDataCodeMapper.toDomain(raw.level);
    } else if (raw.level === null) {
      domainEntity.level = null;
    }

    domainEntity.status = raw.status;

    domainEntity.enrollmentOpen = raw.enrollmentOpen;

    domainEntity.hasCertificate = raw.hasCertificate;

    domainEntity.isFree = raw.isFree;

    domainEntity.price = raw.price;

    domainEntity.language = raw.language;

    domainEntity.introVideoUrl = raw.introVideoUrl;

    domainEntity.thumbnailUrl = raw.thumbnailUrl;

    domainEntity.fullDescription = raw.fullDescription;

    domainEntity.shortDescription = raw.shortDescription;

    domainEntity.title = raw.title;

    domainEntity.slug = raw.slug;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Course): CourseEntity {
    const persistenceEntity = new CourseEntity();
    persistenceEntity.courseId = domainEntity.courseId;

    if (domainEntity.createdBy) {
      persistenceEntity.createdBy = UserMapper.toPersistence(
        domainEntity.createdBy,
      );
    } else if (domainEntity.createdBy === null) {
      persistenceEntity.createdBy = null;
    }

    if (domainEntity.publishedBy) {
      persistenceEntity.publishedBy = UserMapper.toPersistence(
        domainEntity.publishedBy,
      );
    } else if (domainEntity.publishedBy === null) {
      persistenceEntity.publishedBy = null;
    }

    persistenceEntity.publishedAt = domainEntity.publishedAt;

    persistenceEntity.unpublishedAt = domainEntity.unpublishedAt;

    if (domainEntity.unpublishedBy) {
      persistenceEntity.unpublishedBy = UserMapper.toPersistence(
        domainEntity.unpublishedBy,
      );
    } else if (domainEntity.unpublishedBy === null) {
      persistenceEntity.unpublishedBy = null;
    }

    persistenceEntity.requiresSequentialCompletion =
      domainEntity.requiresSequentialCompletion;

    persistenceEntity.avgRating = domainEntity.avgRating;

    persistenceEntity.totalEnrollments = domainEntity.totalEnrollments;

    persistenceEntity.totalDurationSecs = domainEntity.totalDurationSecs;

    persistenceEntity.totalLectures = domainEntity.totalLectures;

    persistenceEntity.totalSections = domainEntity.totalSections;

    if (domainEntity.category) {
      persistenceEntity.category = MasterDataCodeMapper.toPersistence(
        domainEntity.category,
      );
    } else if (domainEntity.category === null) {
      persistenceEntity.category = null;
    }

    if (domainEntity.level) {
      persistenceEntity.level = MasterDataCodeMapper.toPersistence(
        domainEntity.level,
      );
    } else if (domainEntity.level === null) {
      persistenceEntity.level = null;
    }

    persistenceEntity.status = domainEntity.status;

    persistenceEntity.enrollmentOpen = domainEntity.enrollmentOpen;

    persistenceEntity.hasCertificate = domainEntity.hasCertificate;

    persistenceEntity.isFree = domainEntity.isFree;

    persistenceEntity.price = domainEntity.price;

    persistenceEntity.language = domainEntity.language;

    persistenceEntity.introVideoUrl = domainEntity.introVideoUrl;

    persistenceEntity.thumbnailUrl = domainEntity.thumbnailUrl;

    persistenceEntity.fullDescription = domainEntity.fullDescription;

    persistenceEntity.shortDescription = domainEntity.shortDescription;

    persistenceEntity.title = domainEntity.title;

    persistenceEntity.slug = domainEntity.slug;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
