import { FormQuestionOption } from '../../../../domain/form-question-option';
import { FormQuestionMapper } from '../../../../../form-question/infrastructure/persistence/relational/mappers/form-question.mapper';
import { FormQuestionOptionEntity } from '../entities/form-question-option.entity';

export class FormQuestionOptionMapper {
  static toDomain(raw: FormQuestionOptionEntity): FormQuestionOption {
    const domainEntity = new FormQuestionOption();
    if (raw.question) {
      domainEntity.question = FormQuestionMapper.toDomain(raw.question);
    }

    domainEntity.optionCode = raw.optionCode;

    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: FormQuestionOption,
  ): FormQuestionOptionEntity {
    const persistenceEntity = new FormQuestionOptionEntity();
    if (domainEntity.question) {
      persistenceEntity.question = FormQuestionMapper.toPersistence(
        domainEntity.question,
      );
    }

    persistenceEntity.optionCode = domainEntity.optionCode;

    persistenceEntity.displayOrder = domainEntity.displayOrder;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
