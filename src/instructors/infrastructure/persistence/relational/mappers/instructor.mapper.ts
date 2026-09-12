import { Instructor } from '../../../../domain/instructor';
import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { InstructorEntity } from '../entities/instructor.entity';

export class InstructorMapper {
  static toDomain(raw: InstructorEntity): Instructor {
    const domainEntity = new Instructor();
    if (raw.user) {
      domainEntity.user = UserMapper.toDomain(raw.user);
    } else if (raw.user === null) {
      domainEntity.user = null;
    }

    if (raw.createdBy) {
      domainEntity.createdBy = UserMapper.toDomain(raw.createdBy);
    } else if (raw.createdBy === null) {
      domainEntity.createdBy = null;
    }

    domainEntity.slug = raw.slug;

    domainEntity.fullName = raw.fullName;

    domainEntity.headline = raw.headline;

    domainEntity.bio = raw.bio;

    domainEntity.profilePictureUrl = raw.profilePictureUrl;

    domainEntity.emailPublic = raw.emailPublic;

    domainEntity.yearsOfExperience = raw.yearsOfExperience;

    domainEntity.isActive = raw.isActive;

    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.totalCourses = raw.totalCourses;

    domainEntity.totalStudents = raw.totalStudents;

    domainEntity.avgRating = raw.avgRating;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Instructor): InstructorEntity {
    const persistenceEntity = new InstructorEntity();
    if (domainEntity.user) {
      persistenceEntity.user = UserMapper.toPersistence(domainEntity.user);
    } else if (domainEntity.user === null) {
      persistenceEntity.user = null;
    }

    if (domainEntity.createdBy) {
      persistenceEntity.createdBy = UserMapper.toPersistence(
        domainEntity.createdBy,
      );
    } else if (domainEntity.createdBy === null) {
      persistenceEntity.createdBy = null;
    }

    persistenceEntity.slug = domainEntity.slug;

    persistenceEntity.fullName = domainEntity.fullName;

    persistenceEntity.headline = domainEntity.headline;

    persistenceEntity.bio = domainEntity.bio;

    persistenceEntity.profilePictureUrl = domainEntity.profilePictureUrl;

    persistenceEntity.emailPublic = domainEntity.emailPublic;

    persistenceEntity.yearsOfExperience = domainEntity.yearsOfExperience;

    persistenceEntity.isActive = domainEntity.isActive;

    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.totalCourses = domainEntity.totalCourses;

    persistenceEntity.totalStudents = domainEntity.totalStudents;

    persistenceEntity.avgRating = domainEntity.avgRating;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
