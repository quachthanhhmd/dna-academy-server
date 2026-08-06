import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { QuizAttempt } from '../../domain/quiz-attempt';

export abstract class QuizAttemptRepository {
  abstract create(
    data: Omit<QuizAttempt, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<QuizAttempt>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<QuizAttempt[]>;

  abstract findById(id: QuizAttempt['id']): Promise<NullableType<QuizAttempt>>;

  abstract findByIds(ids: QuizAttempt['id'][]): Promise<QuizAttempt[]>;

  abstract update(
    id: QuizAttempt['id'],
    payload: DeepPartial<QuizAttempt>,
  ): Promise<QuizAttempt | null>;

  abstract remove(id: QuizAttempt['id']): Promise<void>;
}
