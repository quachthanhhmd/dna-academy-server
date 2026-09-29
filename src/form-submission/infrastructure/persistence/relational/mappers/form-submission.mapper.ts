import { FormSubmission } from '../../../../domain/form-submission';
import { CourseMapper } from '../../../../../courses/infrastructure/persistence/relational/mappers/course.mapper';
import { FormDefinitionMapper } from '../../../../../form-definition/infrastructure/persistence/relational/mappers/form-definition.mapper';
import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';
import { FormSubmissionEntity } from '../entities/form-submission.entity';

export class FormSubmissionMapper {
  static toDomain(raw: FormSubmissionEntity): FormSubmission {
    const domainEntity = new FormSubmission();
    if (raw.formDefinition) {
      domainEntity.formDefinition = FormDefinitionMapper.toDomain(
        raw.formDefinition,
      );
    }

    domainEntity.formVersion = raw.formVersion;

    if (raw.user) {
      domainEntity.user = UserMapper.toDomain(raw.user);
    }

    domainEntity.fullName = raw.fullName;

    domainEntity.email = raw.email;

    domainEntity.emailNormalized = raw.emailNormalized;

    domainEntity.phone = raw.phone;

    domainEntity.primaryFieldCode = raw.primaryFieldCode;

    if (raw.selectedCourse) {
      domainEntity.selectedCourse = CourseMapper.toDomain(raw.selectedCourse);
    }

    domainEntity.status = raw.status;

    if (raw.assignedToUser) {
      domainEntity.assignedToUser = UserMapper.toDomain(raw.assignedToUser);
    }

    domainEntity.internalNotes = raw.internalNotes;

    domainEntity.isLatest = raw.isLatest;

    if (raw.supersededBy) {
      domainEntity.supersededBy = FormSubmissionMapper.toDomain(
        raw.supersededBy,
      );
    }

    domainEntity.source = raw.source;

    domainEntity.locale = raw.locale;

    domainEntity.utm = raw.utm;

    domainEntity.ipHash = raw.ipHash;

    domainEntity.ipHashDay = raw.ipHashDay;

    domainEntity.userAgent = raw.userAgent;

    domainEntity.isSuspicious = raw.isSuspicious;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: FormSubmission): FormSubmissionEntity {
    const persistenceEntity = new FormSubmissionEntity();
    if (domainEntity.formDefinition) {
      persistenceEntity.formDefinition = FormDefinitionMapper.toPersistence(
        domainEntity.formDefinition,
      );
    }

    persistenceEntity.formVersion = domainEntity.formVersion;

    if (domainEntity.user) {
      persistenceEntity.user = UserMapper.toPersistence(domainEntity.user);
    }

    persistenceEntity.fullName = domainEntity.fullName;

    persistenceEntity.email = domainEntity.email;

    persistenceEntity.emailNormalized = domainEntity.emailNormalized;

    persistenceEntity.phone = domainEntity.phone;

    persistenceEntity.primaryFieldCode = domainEntity.primaryFieldCode;

    if (domainEntity.selectedCourse) {
      persistenceEntity.selectedCourse = CourseMapper.toPersistence(
        domainEntity.selectedCourse,
      );
    }

    persistenceEntity.status = domainEntity.status;

    if (domainEntity.assignedToUser) {
      persistenceEntity.assignedToUser = UserMapper.toPersistence(
        domainEntity.assignedToUser,
      );
    }

    persistenceEntity.internalNotes = domainEntity.internalNotes;

    persistenceEntity.isLatest = domainEntity.isLatest;

    if (domainEntity.supersededBy) {
      persistenceEntity.supersededBy = FormSubmissionMapper.toPersistence(
        domainEntity.supersededBy,
      );
    }

    persistenceEntity.source = domainEntity.source;

    persistenceEntity.locale = domainEntity.locale;

    persistenceEntity.utm = domainEntity.utm;

    persistenceEntity.ipHash = domainEntity.ipHash;

    persistenceEntity.ipHashDay = domainEntity.ipHashDay;

    persistenceEntity.userAgent = domainEntity.userAgent;

    persistenceEntity.isSuspicious = domainEntity.isSuspicious;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
