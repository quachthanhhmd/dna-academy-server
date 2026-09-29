import { FormQuestion } from '../../../../domain/form-question';
import { FormDefinitionMapper } from '../../../../../form-definition/infrastructure/persistence/relational/mappers/form-definition.mapper';
import { FormQuestionEntity } from '../entities/form-question.entity';

export class FormQuestionMapper {
  static toDomain(raw: FormQuestionEntity): FormQuestion {
    const domainEntity = new FormQuestion();
    if (raw.formDefinition) {
      domainEntity.formDefinition = FormDefinitionMapper.toDomain(
        raw.formDefinition,
      );
    }

    domainEntity.code = raw.code;

    domainEntity.sectionCode = raw.sectionCode;

    domainEntity.questionType = raw.questionType;

    domainEntity.masterDataGroupKey = raw.masterDataGroupKey;

    domainEntity.isRequired = raw.isRequired;

    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.labelTranslations = raw.labelTranslations;

    domainEntity.placeholderTranslations = raw.placeholderTranslations;

    domainEntity.helperTranslations = raw.helperTranslations;

    domainEntity.minLength = raw.minLength;

    domainEntity.maxLength = raw.maxLength;

    domainEntity.allowOther = raw.allowOther;

    domainEntity.consentCode = raw.consentCode;

    if (raw.parentQuestion) {
      domainEntity.parentQuestion = FormQuestionMapper.toDomain(
        raw.parentQuestion,
      );
    }

    domainEntity.parentOptionCode = raw.parentOptionCode;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: FormQuestion): FormQuestionEntity {
    const persistenceEntity = new FormQuestionEntity();
    if (domainEntity.formDefinition) {
      persistenceEntity.formDefinition = FormDefinitionMapper.toPersistence(
        domainEntity.formDefinition,
      );
    }

    persistenceEntity.code = domainEntity.code;

    persistenceEntity.sectionCode = domainEntity.sectionCode;

    persistenceEntity.questionType = domainEntity.questionType;

    persistenceEntity.masterDataGroupKey = domainEntity.masterDataGroupKey;

    persistenceEntity.isRequired = domainEntity.isRequired;

    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.labelTranslations = domainEntity.labelTranslations;

    persistenceEntity.placeholderTranslations =
      domainEntity.placeholderTranslations;

    persistenceEntity.helperTranslations = domainEntity.helperTranslations;

    persistenceEntity.minLength = domainEntity.minLength;

    persistenceEntity.maxLength = domainEntity.maxLength;

    persistenceEntity.allowOther = domainEntity.allowOther;

    persistenceEntity.consentCode = domainEntity.consentCode;

    if (domainEntity.parentQuestion) {
      persistenceEntity.parentQuestion = FormQuestionMapper.toPersistence(
        domainEntity.parentQuestion,
      );
    }

    persistenceEntity.parentOptionCode = domainEntity.parentOptionCode;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
