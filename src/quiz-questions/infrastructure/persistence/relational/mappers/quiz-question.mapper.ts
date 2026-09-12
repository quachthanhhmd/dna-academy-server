import { QuizQuestion } from '../../../../domain/quiz-question';

import { LectureMapper } from '../../../../../lectures/infrastructure/persistence/relational/mappers/lecture.mapper';

import { QuizQuestionEntity } from '../entities/quiz-question.entity';

export class QuizQuestionMapper {
  static toDomain(raw: QuizQuestionEntity): QuizQuestion {
    const domainEntity = new QuizQuestion();
    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.maxFileSizeMb = raw.maxFileSizeMb;

    domainEntity.allowedMimeTypes = raw.allowedMimeTypes;

    domainEntity.minWordCount = raw.minWordCount;

    domainEntity.explanation = raw.explanation;

    domainEntity.ratingLabelMax = raw.ratingLabelMax;

    domainEntity.ratingLabelMin = raw.ratingLabelMin;

    domainEntity.ratingMax = raw.ratingMax;

    domainEntity.ratingMin = raw.ratingMin;

    domainEntity.isRequired = raw.isRequired;

    domainEntity.questionType = raw.questionType;

    domainEntity.questionText = raw.questionText;

    if (raw.lecture) {
      domainEntity.lecture = LectureMapper.toDomain(raw.lecture);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: QuizQuestion): QuizQuestionEntity {
    const persistenceEntity = new QuizQuestionEntity();
    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.maxFileSizeMb = domainEntity.maxFileSizeMb;

    persistenceEntity.allowedMimeTypes = domainEntity.allowedMimeTypes;

    persistenceEntity.minWordCount = domainEntity.minWordCount;

    persistenceEntity.explanation = domainEntity.explanation;

    persistenceEntity.ratingLabelMax = domainEntity.ratingLabelMax;

    persistenceEntity.ratingLabelMin = domainEntity.ratingLabelMin;

    persistenceEntity.ratingMax = domainEntity.ratingMax;

    persistenceEntity.ratingMin = domainEntity.ratingMin;

    persistenceEntity.isRequired = domainEntity.isRequired;

    persistenceEntity.questionType = domainEntity.questionType;

    persistenceEntity.questionText = domainEntity.questionText;

    if (domainEntity.lecture) {
      persistenceEntity.lecture = LectureMapper.toPersistence(
        domainEntity.lecture,
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
