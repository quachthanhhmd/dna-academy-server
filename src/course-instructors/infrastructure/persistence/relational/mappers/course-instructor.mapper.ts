import {
  CourseInstructor,
  CourseInstructorRole,
} from '../../../../domain/course-instructor';
import { CourseMapper } from '../../../../../courses/infrastructure/persistence/relational/mappers/course.mapper';
import { InstructorMapper } from '../../../../../instructors/infrastructure/persistence/relational/mappers/instructor.mapper';

import { CourseInstructorEntity } from '../entities/course-instructor.entity';

export class CourseInstructorMapper {
  static toDomain(raw: CourseInstructorEntity): CourseInstructor {
    const domainEntity = new CourseInstructor();

    if (raw.course) {
      domainEntity.course = CourseMapper.toDomain(raw.course);
    }

    if (raw.instructor) {
      domainEntity.instructor = InstructorMapper.toDomain(raw.instructor);
    }

    domainEntity.role = raw.role as CourseInstructorRole;

    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: CourseInstructor): CourseInstructorEntity {
    const persistenceEntity = new CourseInstructorEntity();

    if (domainEntity.course) {
      persistenceEntity.course = CourseMapper.toPersistence(
        domainEntity.course,
      );
    }

    if (domainEntity.instructor) {
      persistenceEntity.instructor = InstructorMapper.toPersistence(
        domainEntity.instructor,
      );
    }

    persistenceEntity.role = domainEntity.role;

    persistenceEntity.displayOrder = domainEntity.displayOrder;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
