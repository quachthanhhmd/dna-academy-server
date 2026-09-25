import { FormDefinition } from '../../../../domain/form-definition';

import { FormDefinitionEntity } from '../entities/form-definition.entity';

export class FormDefinitionMapper {
  static toDomain(raw: FormDefinitionEntity): FormDefinition {
    const domainEntity = new FormDefinition();
    domainEntity.code = raw.code;

    domainEntity.nameTranslations = raw.nameTranslations;

    domainEntity.descriptionTranslations = raw.descriptionTranslations;

    domainEntity.version = raw.version;

    domainEntity.isActive = raw.isActive;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: FormDefinition): FormDefinitionEntity {
    const persistenceEntity = new FormDefinitionEntity();
    persistenceEntity.code = domainEntity.code;

    persistenceEntity.nameTranslations = domainEntity.nameTranslations;

    persistenceEntity.descriptionTranslations =
      domainEntity.descriptionTranslations;

    persistenceEntity.version = domainEntity.version;

    persistenceEntity.isActive = domainEntity.isActive;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
