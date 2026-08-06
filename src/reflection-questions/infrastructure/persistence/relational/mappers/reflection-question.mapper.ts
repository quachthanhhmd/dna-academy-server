import { ReflectionQuestion } from '../../../../domain/reflection-question';

import { LectureMapper } from '../../../../../lectures/infrastructure/persistence/relational/mappers/lecture.mapper';

import { ReflectionQuestionEntity } from '../entities/reflection-question.entity';

export class ReflectionQuestionMapper {
  static toDomain(raw: ReflectionQuestionEntity): ReflectionQuestion {
    const domainEntity = new ReflectionQuestion();
    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.questionText = raw.questionText;

    if (raw.lecture) {
      domainEntity.lecture = LectureMapper.toDomain(raw.lecture);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: ReflectionQuestion,
  ): ReflectionQuestionEntity {
    const persistenceEntity = new ReflectionQuestionEntity();
    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.questionText = domainEntity.questionText;

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
