import { MediaFile } from '../../../../domain/media-file';
import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { MediaFileEntity } from '../entities/media-file.entity';

export class MediaFileMapper {
  static toDomain(raw: MediaFileEntity): MediaFile {
    const domainEntity = new MediaFile();
    if (raw.uploadedBy) {
      domainEntity.uploadedBy = UserMapper.toDomain(raw.uploadedBy);
    } else if (raw.uploadedBy === null) {
      domainEntity.uploadedBy = null;
    }

    domainEntity.status = raw.status;

    domainEntity.sizeBytes = raw.sizeBytes;

    domainEntity.mimeType = raw.mimeType;

    domainEntity.fileName = raw.fileName;

    domainEntity.objectKey = raw.objectKey;

    domainEntity.bucket = raw.bucket;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: MediaFile): MediaFileEntity {
    const persistenceEntity = new MediaFileEntity();
    if (domainEntity.uploadedBy) {
      persistenceEntity.uploadedBy = UserMapper.toPersistence(
        domainEntity.uploadedBy,
      );
    } else if (domainEntity.uploadedBy === null) {
      persistenceEntity.uploadedBy = null;
    }

    persistenceEntity.status = domainEntity.status;

    persistenceEntity.sizeBytes = domainEntity.sizeBytes;

    persistenceEntity.mimeType = domainEntity.mimeType;

    persistenceEntity.fileName = domainEntity.fileName;

    persistenceEntity.objectKey = domainEntity.objectKey;

    persistenceEntity.bucket = domainEntity.bucket;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
