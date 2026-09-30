import { FileType } from '../../../../domain/file';
import { MediaFileEntity } from '../../../../../media-files/infrastructure/persistence/relational/entities/media-file.entity';

export class FileMapper {
  static toDomain(raw: MediaFileEntity): FileType {
    const domainEntity = new FileType();
    domainEntity.id = raw.id;
    domainEntity.path = raw.objectKey;
    domainEntity.bucket = raw.bucket;
    domainEntity.visibility = raw.visibility;
    domainEntity.purpose = raw.purpose;
    domainEntity.fileName = raw.fileName;
    return domainEntity;
  }

  /** A reference to an existing row, for a relation on another entity. */
  static toReference(domainEntity: Pick<FileType, 'id'>): MediaFileEntity {
    const persistenceEntity = new MediaFileEntity();
    persistenceEntity.id = domainEntity.id;
    return persistenceEntity;
  }
}
