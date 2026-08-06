import { LectureContentDocument } from '../../../../domain/lecture-content-document';

import { LectureMapper } from '../../../../../lectures/infrastructure/persistence/relational/mappers/lecture.mapper';

import { LectureContentDocumentEntity } from '../entities/lecture-content-document.entity';

export class LectureContentDocumentMapper {
  static toDomain(raw: LectureContentDocumentEntity): LectureContentDocument {
    const domainEntity = new LectureContentDocument();
    domainEntity.isDownloadable = raw.isDownloadable;

    domainEntity.fileName = raw.fileName;

    domainEntity.fileUrl = raw.fileUrl;

    if (raw.lecture) {
      domainEntity.lecture = LectureMapper.toDomain(raw.lecture);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: LectureContentDocument,
  ): LectureContentDocumentEntity {
    const persistenceEntity = new LectureContentDocumentEntity();
    persistenceEntity.isDownloadable = domainEntity.isDownloadable;

    persistenceEntity.fileName = domainEntity.fileName;

    persistenceEntity.fileUrl = domainEntity.fileUrl;

    if (domainEntity.lecture) {
      persistenceEntity.lecture = LectureMapper.toPersistence(
        domainEntity.lecture,
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
