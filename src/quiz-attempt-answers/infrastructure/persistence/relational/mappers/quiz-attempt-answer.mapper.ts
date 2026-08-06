import { QuizAttemptAnswer } from '../../../../domain/quiz-attempt-answer';

import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { MediaFileMapper } from '../../../../../media-files/infrastructure/persistence/relational/mappers/media-file.mapper';

import { QuizAnswerOptionMapper } from '../../../../../quiz-answer-options/infrastructure/persistence/relational/mappers/quiz-answer-option.mapper';

import { QuizQuestionMapper } from '../../../../../quiz-questions/infrastructure/persistence/relational/mappers/quiz-question.mapper';

import { QuizAttemptMapper } from '../../../../../quiz-attempts/infrastructure/persistence/relational/mappers/quiz-attempt.mapper';

import { QuizAttemptAnswerEntity } from '../entities/quiz-attempt-answer.entity';

export class QuizAttemptAnswerMapper {
  static toDomain(raw: QuizAttemptAnswerEntity): QuizAttemptAnswer {
    const domainEntity = new QuizAttemptAnswer();
    domainEntity.gradedAt = raw.gradedAt;

    if (raw.gradedBy) {
      domainEntity.gradedBy = UserMapper.toDomain(raw.gradedBy);
    } else if (raw.gradedBy === null) {
      domainEntity.gradedBy = null;
    }

    domainEntity.score = raw.score;

    domainEntity.isCorrect = raw.isCorrect;

    if (raw.file) {
      domainEntity.file = MediaFileMapper.toDomain(raw.file);
    } else if (raw.file === null) {
      domainEntity.file = null;
    }

    domainEntity.ratingAnswer = raw.ratingAnswer;

    domainEntity.textAnswer = raw.textAnswer;

    domainEntity.selectedOptionIds = raw.selectedOptionIds;

    if (raw.selectedOption) {
      domainEntity.selectedOption = QuizAnswerOptionMapper.toDomain(
        raw.selectedOption,
      );
    } else if (raw.selectedOption === null) {
      domainEntity.selectedOption = null;
    }

    if (raw.question) {
      domainEntity.question = QuizQuestionMapper.toDomain(raw.question);
    }

    if (raw.attempt) {
      domainEntity.attempt = QuizAttemptMapper.toDomain(raw.attempt);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(
    domainEntity: QuizAttemptAnswer,
  ): QuizAttemptAnswerEntity {
    const persistenceEntity = new QuizAttemptAnswerEntity();
    persistenceEntity.gradedAt = domainEntity.gradedAt;

    if (domainEntity.gradedBy) {
      persistenceEntity.gradedBy = UserMapper.toPersistence(
        domainEntity.gradedBy,
      );
    } else if (domainEntity.gradedBy === null) {
      persistenceEntity.gradedBy = null;
    }

    persistenceEntity.score = domainEntity.score;

    persistenceEntity.isCorrect = domainEntity.isCorrect;

    if (domainEntity.file) {
      persistenceEntity.file = MediaFileMapper.toPersistence(domainEntity.file);
    } else if (domainEntity.file === null) {
      persistenceEntity.file = null;
    }

    persistenceEntity.ratingAnswer = domainEntity.ratingAnswer;

    persistenceEntity.textAnswer = domainEntity.textAnswer;

    persistenceEntity.selectedOptionIds = domainEntity.selectedOptionIds;

    if (domainEntity.selectedOption) {
      persistenceEntity.selectedOption = QuizAnswerOptionMapper.toPersistence(
        domainEntity.selectedOption,
      );
    } else if (domainEntity.selectedOption === null) {
      persistenceEntity.selectedOption = null;
    }

    if (domainEntity.question) {
      persistenceEntity.question = QuizQuestionMapper.toPersistence(
        domainEntity.question,
      );
    }

    if (domainEntity.attempt) {
      persistenceEntity.attempt = QuizAttemptMapper.toPersistence(
        domainEntity.attempt,
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
