import { MasterDataGroup } from '../../../../domain/master-data-group';
import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { MasterDataGroupEntity } from '../entities/master-data-group.entity';
import { LocaleContext } from '../../../../../utils/i18n/locale-context';
import { pickLocalized } from '../../../../../utils/i18n/pick-localized';
import { DEFAULT_LOCALE } from '../../../../../utils/i18n/locale';

export class MasterDataGroupMapper {
  static toDomain(raw: MasterDataGroupEntity): MasterDataGroup {
    const domainEntity = new MasterDataGroup();
    if (raw.createdBy) {
      domainEntity.createdBy = UserMapper.toDomain(raw.createdBy);
    } else if (raw.createdBy === null) {
      domainEntity.createdBy = null;
    }

    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.isActive = raw.isActive;

    const locale = LocaleContext.current();

    domainEntity.nameTranslations = raw.nameTranslations ?? {};
    domainEntity.descriptionTranslations = raw.descriptionTranslations ?? {};

    domainEntity.description = pickLocalized(
      domainEntity.descriptionTranslations,
      locale,
      raw.description,
    );

    domainEntity.name = pickLocalized(
      domainEntity.nameTranslations,
      locale,
      raw.name,
    );

    domainEntity.groupKey = raw.groupKey;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: MasterDataGroup): MasterDataGroupEntity {
    const persistenceEntity = new MasterDataGroupEntity();
    if (domainEntity.createdBy) {
      persistenceEntity.createdBy = UserMapper.toPersistence(
        domainEntity.createdBy,
      );
    } else if (domainEntity.createdBy === null) {
      persistenceEntity.createdBy = null;
    }

    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.isActive = domainEntity.isActive;

    // Locale-independent by design — see MasterDataCodeMapper.toPersistence.
    persistenceEntity.nameTranslations = domainEntity.nameTranslations ?? {};
    persistenceEntity.descriptionTranslations =
      domainEntity.descriptionTranslations ?? {};

    persistenceEntity.description =
      persistenceEntity.descriptionTranslations[DEFAULT_LOCALE] ??
      domainEntity.description;

    persistenceEntity.name =
      persistenceEntity.nameTranslations[DEFAULT_LOCALE] ?? domainEntity.name;

    persistenceEntity.groupKey = domainEntity.groupKey;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
