import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { QuizAnswerOption } from '../../domain/quiz-answer-option';

export abstract class QuizAnswerOptionRepository {
  abstract create(
    data: Omit<QuizAnswerOption, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<QuizAnswerOption>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<QuizAnswerOption[]>;

  abstract findById(
    id: QuizAnswerOption['id'],
  ): Promise<NullableType<QuizAnswerOption>>;

  abstract findByIds(
    ids: QuizAnswerOption['id'][],
  ): Promise<QuizAnswerOption[]>;

  abstract update(
    id: QuizAnswerOption['id'],
    payload: DeepPartial<QuizAnswerOption>,
  ): Promise<QuizAnswerOption | null>;

  abstract remove(id: QuizAnswerOption['id']): Promise<void>;
}
