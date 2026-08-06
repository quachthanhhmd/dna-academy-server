import { LectureContentArticle } from '../../../../domain/lecture-content-article';

import { LectureMapper } from '../../../../../lectures/infrastructure/persistence/relational/mappers/lecture.mapper';

import { LectureContentArticleEntity } from '../entities/lecture-content-article.entity';

export class LectureContentArticleMapper {
  static toDomain(raw: LectureContentArticleEntity): LectureContentArticle {
    const domainEntity = new LectureContentArticle();
    domainEntity.body = raw.body;

    if (raw.lecture) {
      domainEntity.lecture = LectureMapper.toDomain(raw.lecture);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: LectureContentArticle,
  ): LectureContentArticleEntity {
    const persistenceEntity = new LectureContentArticleEntity();
    persistenceEntity.body = domainEntity.body;

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
