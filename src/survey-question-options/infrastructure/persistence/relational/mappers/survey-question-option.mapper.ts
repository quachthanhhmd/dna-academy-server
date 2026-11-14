import { SurveyQuestionOption } from '../../../../domain/survey-question-option';
import { SurveyQuestionMapper } from '../../../../../survey-questions/infrastructure/persistence/relational/mappers/survey-question.mapper';

import { SurveyQuestionOptionEntity } from '../entities/survey-question-option.entity';

export class SurveyQuestionOptionMapper {
  static toDomain(raw: SurveyQuestionOptionEntity): SurveyQuestionOption {
    const domainEntity = new SurveyQuestionOption();
    if (raw.question) {
      domainEntity.question = SurveyQuestionMapper.toDomain(raw.question);
    }

    domainEntity.archivedAt = raw.archivedAt;

    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.optionText = raw.optionText;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: SurveyQuestionOption,
  ): SurveyQuestionOptionEntity {
    const persistenceEntity = new SurveyQuestionOptionEntity();
    if (domainEntity.question) {
      persistenceEntity.question = SurveyQuestionMapper.toPersistence(
        domainEntity.question,
      );
    }

    persistenceEntity.archivedAt = domainEntity.archivedAt;

    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.optionText = domainEntity.optionText;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
