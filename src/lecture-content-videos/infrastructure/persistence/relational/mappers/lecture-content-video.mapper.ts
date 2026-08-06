import { LectureContentVideo } from '../../../../domain/lecture-content-video';

import { LectureMapper } from '../../../../../lectures/infrastructure/persistence/relational/mappers/lecture.mapper';

import { LectureContentVideoEntity } from '../entities/lecture-content-video.entity';

export class LectureContentVideoMapper {
  static toDomain(raw: LectureContentVideoEntity): LectureContentVideo {
    const domainEntity = new LectureContentVideo();
    domainEntity.youtubeVideoId = raw.youtubeVideoId;

    domainEntity.youtubeUrl = raw.youtubeUrl;

    if (raw.lecture) {
      domainEntity.lecture = LectureMapper.toDomain(raw.lecture);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: LectureContentVideo,
  ): LectureContentVideoEntity {
    const persistenceEntity = new LectureContentVideoEntity();
    persistenceEntity.youtubeVideoId = domainEntity.youtubeVideoId;

    persistenceEntity.youtubeUrl = domainEntity.youtubeUrl;

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
