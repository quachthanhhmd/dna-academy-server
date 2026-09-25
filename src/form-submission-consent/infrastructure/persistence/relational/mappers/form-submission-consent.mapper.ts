import { FormSubmissionConsent } from '../../../../domain/form-submission-consent';
import { FormSubmissionMapper } from '../../../../../form-submission/infrastructure/persistence/relational/mappers/form-submission.mapper';
import { FormSubmissionConsentEntity } from '../entities/form-submission-consent.entity';

export class FormSubmissionConsentMapper {
  static toDomain(raw: FormSubmissionConsentEntity): FormSubmissionConsent {
    const domainEntity = new FormSubmissionConsent();
    if (raw.submission) {
      domainEntity.submission = FormSubmissionMapper.toDomain(raw.submission);
    }

    domainEntity.consentCode = raw.consentCode;

    domainEntity.version = raw.version;

    domainEntity.acceptedAt = raw.acceptedAt;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: FormSubmissionConsent,
  ): FormSubmissionConsentEntity {
    const persistenceEntity = new FormSubmissionConsentEntity();
    if (domainEntity.submission) {
      persistenceEntity.submission = FormSubmissionMapper.toPersistence(
        domainEntity.submission,
      );
    }

    persistenceEntity.consentCode = domainEntity.consentCode;

    persistenceEntity.version = domainEntity.version;

    persistenceEntity.acceptedAt = domainEntity.acceptedAt;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
