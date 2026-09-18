import { CareerReflectionQuestion } from '../../../../domain/career-reflection-question';

import { CourseMapper } from '../../../../../courses/infrastructure/persistence/relational/mappers/course.mapper';

import { CareerReflectionQuestionEntity } from '../entities/career-reflection-question.entity';

/**
 * Epic 4.1 §3.1 / 4.6 — question text and labels pass through this mapper **raw**, unlike master data,
 * which localizes inside its mapper.
 *
 * The reason is `update()`: it is a read-modify-write through both mappers, so
 * a localized `toDomain` would let a PATCH sent under `?locale=en` write the
 * English label back into the Vietnamese base column. Master data works around
 * that in `toPersistence`; here there is exactly one public read, so
 * localization lives there instead and the round trip stays lossless.
 */
export class CareerReflectionQuestionMapper {
  static toDomain(
    raw: CareerReflectionQuestionEntity,
  ): CareerReflectionQuestion {
    const domainEntity = new CareerReflectionQuestion();
    domainEntity.isActive = raw.isActive;

    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.questionType = raw.questionType;

    domainEntity.isRequired = raw.isRequired;

    domainEntity.options = raw.options;

    domainEntity.questionText = raw.questionText;

    domainEntity.questionTextTranslations = raw.questionTextTranslations;

    domainEntity.category = raw.category;

    if (raw.course) {
      domainEntity.course = CourseMapper.toDomain(raw.course);
    } else if (raw.course === null) {
      domainEntity.course = null;
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: CareerReflectionQuestion,
  ): CareerReflectionQuestionEntity {
    const persistenceEntity = new CareerReflectionQuestionEntity();
    persistenceEntity.isActive = domainEntity.isActive;

    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.questionType = domainEntity.questionType;

    persistenceEntity.isRequired = domainEntity.isRequired;

    persistenceEntity.options = domainEntity.options;

    persistenceEntity.questionText = domainEntity.questionText;

    persistenceEntity.questionTextTranslations =
      domainEntity.questionTextTranslations;

    persistenceEntity.category = domainEntity.category;

    if (domainEntity.course) {
      persistenceEntity.course = CourseMapper.toPersistence(
        domainEntity.course,
      );
    } else if (domainEntity.course === null) {
      persistenceEntity.course = null;
    }

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
