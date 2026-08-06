import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { QuizAttemptAnswer } from '../../domain/quiz-attempt-answer';

export abstract class QuizAttemptAnswerRepository {
  abstract create(
    data: Omit<QuizAttemptAnswer, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<QuizAttemptAnswer>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<QuizAttemptAnswer[]>;

  abstract findById(
    id: QuizAttemptAnswer['id'],
  ): Promise<NullableType<QuizAttemptAnswer>>;

  abstract findByIds(
    ids: QuizAttemptAnswer['id'][],
  ): Promise<QuizAttemptAnswer[]>;

  abstract update(
    id: QuizAttemptAnswer['id'],
    payload: DeepPartial<QuizAttemptAnswer>,
  ): Promise<QuizAttemptAnswer | null>;

  abstract remove(id: QuizAttemptAnswer['id']): Promise<void>;
}
