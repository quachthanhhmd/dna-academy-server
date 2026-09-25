import { FormSubmissionEvent } from '../../../../domain/form-submission-event';
import { FormSubmissionMapper } from '../../../../../form-submission/infrastructure/persistence/relational/mappers/form-submission.mapper';
import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';
import { FormSubmissionEventEntity } from '../entities/form-submission-event.entity';

export class FormSubmissionEventMapper {
  static toDomain(raw: FormSubmissionEventEntity): FormSubmissionEvent {
    const domainEntity = new FormSubmissionEvent();
    if (raw.submission) {
      domainEntity.submission = FormSubmissionMapper.toDomain(raw.submission);
    }

    domainEntity.event = raw.event;

    domainEntity.fromStatus = raw.fromStatus;

    domainEntity.toStatus = raw.toStatus;

    if (raw.actorUser) {
      domainEntity.actorUser = UserMapper.toDomain(raw.actorUser);
    }

    domainEntity.payload = raw.payload;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: FormSubmissionEvent,
  ): FormSubmissionEventEntity {
    const persistenceEntity = new FormSubmissionEventEntity();
    if (domainEntity.submission) {
      persistenceEntity.submission = FormSubmissionMapper.toPersistence(
        domainEntity.submission,
      );
    }

    persistenceEntity.event = domainEntity.event;

    persistenceEntity.fromStatus = domainEntity.fromStatus;

    persistenceEntity.toStatus = domainEntity.toStatus;

    if (domainEntity.actorUser) {
      persistenceEntity.actorUser = UserMapper.toPersistence(
        domainEntity.actorUser,
      );
    }

    persistenceEntity.payload = domainEntity.payload;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
