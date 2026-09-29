import { FormAnswerOption } from '../../../../domain/form-answer-option';
import { FormAnswerMapper } from '../../../../../form-answer/infrastructure/persistence/relational/mappers/form-answer.mapper';
import { FormQuestionMapper } from '../../../../../form-question/infrastructure/persistence/relational/mappers/form-question.mapper';
import { FormSubmissionMapper } from '../../../../../form-submission/infrastructure/persistence/relational/mappers/form-submission.mapper';
import { FormAnswerOptionEntity } from '../entities/form-answer-option.entity';

export class FormAnswerOptionMapper {
  static toDomain(raw: FormAnswerOptionEntity): FormAnswerOption {
    const domainEntity = new FormAnswerOption();
    if (raw.answer) {
      domainEntity.answer = FormAnswerMapper.toDomain(raw.answer);
    }

    if (raw.question) {
      domainEntity.question = FormQuestionMapper.toDomain(raw.question);
    }

    if (raw.submission) {
      domainEntity.submission = FormSubmissionMapper.toDomain(raw.submission);
    }

    domainEntity.optionCode = raw.optionCode;

    domainEntity.optionGroupKey = raw.optionGroupKey;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: FormAnswerOption): FormAnswerOptionEntity {
    const persistenceEntity = new FormAnswerOptionEntity();
    if (domainEntity.answer) {
      persistenceEntity.answer = FormAnswerMapper.toPersistence(
        domainEntity.answer,
      );
    }

    if (domainEntity.question) {
      persistenceEntity.question = FormQuestionMapper.toPersistence(
        domainEntity.question,
      );
    }

    if (domainEntity.submission) {
      persistenceEntity.submission = FormSubmissionMapper.toPersistence(
        domainEntity.submission,
      );
    }

    persistenceEntity.optionCode = domainEntity.optionCode;

    persistenceEntity.optionGroupKey = domainEntity.optionGroupKey;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
