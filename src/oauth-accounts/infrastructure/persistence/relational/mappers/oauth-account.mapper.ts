import { OauthAccount } from '../../../../domain/oauth-account';

import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { OauthAccountEntity } from '../entities/oauth-account.entity';

export class OauthAccountMapper {
  static toDomain(raw: OauthAccountEntity): OauthAccount {
    const domainEntity = new OauthAccount();
    domainEntity.tokenExpiresAt = raw.tokenExpiresAt;

    domainEntity.refreshToken = raw.refreshToken;

    domainEntity.accessToken = raw.accessToken;

    domainEntity.providerUid = raw.providerUid;

    domainEntity.provider = raw.provider;

    if (raw.user) {
      domainEntity.user = UserMapper.toDomain(raw.user);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: OauthAccount): OauthAccountEntity {
    const persistenceEntity = new OauthAccountEntity();
    persistenceEntity.tokenExpiresAt = domainEntity.tokenExpiresAt;

    persistenceEntity.refreshToken = domainEntity.refreshToken;

    persistenceEntity.accessToken = domainEntity.accessToken;

    persistenceEntity.providerUid = domainEntity.providerUid;

    persistenceEntity.provider = domainEntity.provider;

    if (domainEntity.user) {
      persistenceEntity.user = UserMapper.toPersistence(domainEntity.user);
    }

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
