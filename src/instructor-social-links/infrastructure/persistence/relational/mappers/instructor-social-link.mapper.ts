import {
  InstructorSocialLink,
  SocialLinkPlatform,
} from '../../../../domain/instructor-social-link';
import { InstructorMapper } from '../../../../../instructors/infrastructure/persistence/relational/mappers/instructor.mapper';

import { InstructorSocialLinkEntity } from '../entities/instructor-social-link.entity';

export class InstructorSocialLinkMapper {
  static toDomain(raw: InstructorSocialLinkEntity): InstructorSocialLink {
    const domainEntity = new InstructorSocialLink();

    if (raw.instructor) {
      domainEntity.instructor = InstructorMapper.toDomain(raw.instructor);
    }

    domainEntity.platform = raw.platform as SocialLinkPlatform;

    domainEntity.url = raw.url;

    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: InstructorSocialLink,
  ): InstructorSocialLinkEntity {
    const persistenceEntity = new InstructorSocialLinkEntity();

    if (domainEntity.instructor) {
      persistenceEntity.instructor = InstructorMapper.toPersistence(
        domainEntity.instructor,
      );
    }

    persistenceEntity.platform = domainEntity.platform;

    persistenceEntity.url = domainEntity.url;

    persistenceEntity.displayOrder = domainEntity.displayOrder;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
