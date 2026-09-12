import { MasterDataCode } from '../../../../domain/master-data-code';
import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { MasterDataGroupMapper } from '../../../../../master-data-groups/infrastructure/persistence/relational/mappers/master-data-group.mapper';

import { MasterDataCodeEntity } from '../entities/master-data-code.entity';
import { LocaleContext } from '../../../../../utils/i18n/locale-context';
import { pickLocalized } from '../../../../../utils/i18n/pick-localized';
import { DEFAULT_LOCALE } from '../../../../../utils/i18n/locale';

export class MasterDataCodeMapper {
  static toDomain(raw: MasterDataCodeEntity): MasterDataCode {
    const domainEntity = new MasterDataCode();
    if (raw.createdBy) {
      domainEntity.createdBy = UserMapper.toDomain(raw.createdBy);
    } else if (raw.createdBy === null) {
      domainEntity.createdBy = null;
    }

    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.isActive = raw.isActive;

    domainEntity.thumbnailUrl = raw.thumbnailUrl;

    // Epic 6 §2.3: every read of a master-data label goes through the mapper,
    // so localization happens once here rather than at ~8 call sites.
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

    domainEntity.code = raw.code;

    if (raw.group) {
      domainEntity.group = MasterDataGroupMapper.toDomain(raw.group);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: MasterDataCode): MasterDataCodeEntity {
    const persistenceEntity = new MasterDataCodeEntity();
    if (domainEntity.createdBy) {
      persistenceEntity.createdBy = UserMapper.toPersistence(
        domainEntity.createdBy,
      );
    } else if (domainEntity.createdBy === null) {
      persistenceEntity.createdBy = null;
    }

    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.isActive = domainEntity.isActive;

    persistenceEntity.thumbnailUrl = domainEntity.thumbnailUrl;

    // Deliberately locale-independent. `MasterDataCodeRepository.update` is a
    // read-modify-write through both mappers, so deriving the base columns
    // from the domain's (localized) name would let a PATCH sent under
    // ?locale=en silently overwrite the Vietnamese value.
    persistenceEntity.nameTranslations = domainEntity.nameTranslations ?? {};
    persistenceEntity.descriptionTranslations =
      domainEntity.descriptionTranslations ?? {};

    persistenceEntity.description =
      persistenceEntity.descriptionTranslations[DEFAULT_LOCALE] ??
      domainEntity.description;

    persistenceEntity.name =
      persistenceEntity.nameTranslations[DEFAULT_LOCALE] ?? domainEntity.name;

    persistenceEntity.code = domainEntity.code;

    if (domainEntity.group) {
      persistenceEntity.group = MasterDataGroupMapper.toPersistence(
        domainEntity.group,
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
