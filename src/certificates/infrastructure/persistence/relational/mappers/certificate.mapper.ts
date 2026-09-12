import { Certificate } from '../../../../domain/certificate';

import { MediaFileMapper } from '../../../../../media-files/infrastructure/persistence/relational/mappers/media-file.mapper';

import { CourseMapper } from '../../../../../courses/infrastructure/persistence/relational/mappers/course.mapper';

import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { EnrollmentMapper } from '../../../../../enrollments/infrastructure/persistence/relational/mappers/enrollment.mapper';

import { CertificateEntity } from '../entities/certificate.entity';

export class CertificateMapper {
  static toDomain(raw: CertificateEntity): Certificate {
    const domainEntity = new Certificate();
    domainEntity.issuedAt = raw.issuedAt;

    if (raw.file) {
      domainEntity.file = MediaFileMapper.toDomain(raw.file);
    } else if (raw.file === null) {
      domainEntity.file = null;
    }

    domainEntity.completionDate = raw.completionDate;

    domainEntity.courseTitleSnapshot = raw.courseTitleSnapshot;

    domainEntity.studentNameSnapshot = raw.studentNameSnapshot;

    domainEntity.certificateNumber = raw.certificateNumber;

    domainEntity.finalGradePct = raw.finalGradePct;

    if (raw.course) {
      domainEntity.course = CourseMapper.toDomain(raw.course);
    }

    if (raw.student) {
      domainEntity.student = UserMapper.toDomain(raw.student);
    }

    if (raw.enrollment) {
      domainEntity.enrollment = EnrollmentMapper.toDomain(raw.enrollment);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Certificate): CertificateEntity {
    const persistenceEntity = new CertificateEntity();
    persistenceEntity.issuedAt = domainEntity.issuedAt;

    if (domainEntity.file) {
      persistenceEntity.file = MediaFileMapper.toPersistence(domainEntity.file);
    } else if (domainEntity.file === null) {
      persistenceEntity.file = null;
    }

    persistenceEntity.completionDate = domainEntity.completionDate;

    persistenceEntity.courseTitleSnapshot = domainEntity.courseTitleSnapshot;

    persistenceEntity.studentNameSnapshot = domainEntity.studentNameSnapshot;

    persistenceEntity.certificateNumber = domainEntity.certificateNumber;

    persistenceEntity.finalGradePct = domainEntity.finalGradePct;

    if (domainEntity.course) {
      persistenceEntity.course = CourseMapper.toPersistence(
        domainEntity.course,
      );
    }

    if (domainEntity.student) {
      persistenceEntity.student = UserMapper.toPersistence(
        domainEntity.student,
      );
    }

    if (domainEntity.enrollment) {
      persistenceEntity.enrollment = EnrollmentMapper.toPersistence(
        domainEntity.enrollment,
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
