import { FormAnswer } from '../../../../domain/form-answer';
import { FormQuestionMapper } from '../../../../../form-question/infrastructure/persistence/relational/mappers/form-question.mapper';
import { FormSubmissionMapper } from '../../../../../form-submission/infrastructure/persistence/relational/mappers/form-submission.mapper';
import { FormAnswerEntity } from '../entities/form-answer.entity';

export class FormAnswerMapper {
  static toDomain(raw: FormAnswerEntity): FormAnswer {
    const domainEntity = new FormAnswer();
    if (raw.submission) {
      domainEntity.submission = FormSubmissionMapper.toDomain(raw.submission);
    }

    if (raw.question) {
      domainEntity.question = FormQuestionMapper.toDomain(raw.question);
    }

    domainEntity.textValue = raw.textValue;

    domainEntity.numberValue = raw.numberValue;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: FormAnswer): FormAnswerEntity {
    const persistenceEntity = new FormAnswerEntity();
    if (domainEntity.submission) {
      persistenceEntity.submission = FormSubmissionMapper.toPersistence(
        domainEntity.submission,
      );
    }

    if (domainEntity.question) {
      persistenceEntity.question = FormQuestionMapper.toPersistence(
        domainEntity.question,
      );
    }

    persistenceEntity.textValue = domainEntity.textValue;

    persistenceEntity.numberValue = domainEntity.numberValue;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
