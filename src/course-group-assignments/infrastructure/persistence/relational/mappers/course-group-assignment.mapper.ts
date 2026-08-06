import { CourseGroupAssignment } from '../../../../domain/course-group-assignment';
import { MasterDataCodeMapper } from '../../../../../master-data-codes/infrastructure/persistence/relational/mappers/master-data-code.mapper';

import { CourseMapper } from '../../../../../courses/infrastructure/persistence/relational/mappers/course.mapper';

import { CourseGroupAssignmentEntity } from '../entities/course-group-assignment.entity';

export class CourseGroupAssignmentMapper {
  static toDomain(raw: CourseGroupAssignmentEntity): CourseGroupAssignment {
    const domainEntity = new CourseGroupAssignment();
    if (raw.group) {
      domainEntity.group = MasterDataCodeMapper.toDomain(raw.group);
    }

    if (raw.course) {
      domainEntity.course = CourseMapper.toDomain(raw.course);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: CourseGroupAssignment,
  ): CourseGroupAssignmentEntity {
    const persistenceEntity = new CourseGroupAssignmentEntity();
    if (domainEntity.group) {
      persistenceEntity.group = MasterDataCodeMapper.toPersistence(
        domainEntity.group,
      );
    }

    if (domainEntity.course) {
      persistenceEntity.course = CourseMapper.toPersistence(
        domainEntity.course,
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
