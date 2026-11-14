import { SurveyAnswer } from '../../../../domain/survey-answer';
import { SurveyQuestionOptionMapper } from '../../../../../survey-question-options/infrastructure/persistence/relational/mappers/survey-question-option.mapper';

import { SurveyQuestionMapper } from '../../../../../survey-questions/infrastructure/persistence/relational/mappers/survey-question.mapper';

import { SurveyResponseMapper } from '../../../../../survey-responses/infrastructure/persistence/relational/mappers/survey-response.mapper';

import { SurveyAnswerEntity } from '../entities/survey-answer.entity';

export class SurveyAnswerMapper {
  static toDomain(raw: SurveyAnswerEntity): SurveyAnswer {
    const domainEntity = new SurveyAnswer();
    if (raw.option) {
      domainEntity.option = SurveyQuestionOptionMapper.toDomain(raw.option);
    } else if (raw.option === null) {
      domainEntity.option = null;
    }

    if (raw.question) {
      domainEntity.question = SurveyQuestionMapper.toDomain(raw.question);
    }

    if (raw.response) {
      domainEntity.response = SurveyResponseMapper.toDomain(raw.response);
    }

    domainEntity.ratingValue = raw.ratingValue;

    domainEntity.textAnswer = raw.textAnswer;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: SurveyAnswer): SurveyAnswerEntity {
    const persistenceEntity = new SurveyAnswerEntity();
    if (domainEntity.option) {
      persistenceEntity.option = SurveyQuestionOptionMapper.toPersistence(
        domainEntity.option,
      );
    } else if (domainEntity.option === null) {
      persistenceEntity.option = null;
    }

    if (domainEntity.question) {
      persistenceEntity.question = SurveyQuestionMapper.toPersistence(
        domainEntity.question,
      );
    }

    if (domainEntity.response) {
      persistenceEntity.response = SurveyResponseMapper.toPersistence(
        domainEntity.response,
      );
    }

    persistenceEntity.ratingValue = domainEntity.ratingValue;

    persistenceEntity.textAnswer = domainEntity.textAnswer;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
