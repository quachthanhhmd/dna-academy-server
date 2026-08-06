import { QuizAnswerOption } from '../../../../domain/quiz-answer-option';

import { QuizQuestionMapper } from '../../../../../quiz-questions/infrastructure/persistence/relational/mappers/quiz-question.mapper';

import { QuizAnswerOptionEntity } from '../entities/quiz-answer-option.entity';

export class QuizAnswerOptionMapper {
  static toDomain(raw: QuizAnswerOptionEntity): QuizAnswerOption {
    const domainEntity = new QuizAnswerOption();
    domainEntity.displayOrder = raw.displayOrder;

    domainEntity.isCorrect = raw.isCorrect;

    domainEntity.optionText = raw.optionText;

    if (raw.question) {
      domainEntity.question = QuizQuestionMapper.toDomain(raw.question);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: QuizAnswerOption): QuizAnswerOptionEntity {
    const persistenceEntity = new QuizAnswerOptionEntity();
    persistenceEntity.displayOrder = domainEntity.displayOrder;

    persistenceEntity.isCorrect = domainEntity.isCorrect;

    persistenceEntity.optionText = domainEntity.optionText;

    if (domainEntity.question) {
      persistenceEntity.question = QuizQuestionMapper.toPersistence(
        domainEntity.question,
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
