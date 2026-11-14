import { SurveyQuestion } from '../../../../domain/survey-question';
import { LectureMapper } from '../../../../../lectures/infrastructure/persistence/relational/mappers/lecture.mapper';

import { SurveyQuestionEntity } from '../entities/survey-question.entity';

export class SurveyQuestionMapper {
  static toDomain(raw: SurveyQuestionEntity): SurveyQuestion {
    const domainEntity = new SurveyQuestion();
    if (raw.lecture) {
      domainEntity.lecture = LectureMapper.toDomain(raw.lecture);
    }

    domainEntity.archivedAt = raw.archivedAt;

    domainEntity.ratingLabelMax = raw.ratingLabelMax;

    domainEntity.ratingLabelMin = raw.ratingLabelMin;

    domainEntity.ratingMax = raw.ratingMax;

    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.isRequired = raw.isRequired;

    domainEntity.questionText = raw.questionText;

    domainEntity.questionType = raw.questionType;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: SurveyQuestion): SurveyQuestionEntity {
    const persistenceEntity = new SurveyQuestionEntity();
    if (domainEntity.lecture) {
      persistenceEntity.lecture = LectureMapper.toPersistence(
        domainEntity.lecture,
      );
    }

    persistenceEntity.archivedAt = domainEntity.archivedAt;

    persistenceEntity.ratingLabelMax = domainEntity.ratingLabelMax;

    persistenceEntity.ratingLabelMin = domainEntity.ratingLabelMin;

    persistenceEntity.ratingMax = domainEntity.ratingMax;

    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.isRequired = domainEntity.isRequired;

    persistenceEntity.questionText = domainEntity.questionText;

    persistenceEntity.questionType = domainEntity.questionType;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
