import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { QuizQuestion } from '../../domain/quiz-question';

export abstract class QuizQuestionRepository {
  abstract create(
    data: Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<QuizQuestion>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<QuizQuestion[]>;

  abstract findById(
    id: QuizQuestion['id'],
  ): Promise<NullableType<QuizQuestion>>;

  abstract findByIds(ids: QuizQuestion['id'][]): Promise<QuizQuestion[]>;

  abstract update(
    id: QuizQuestion['id'],
    payload: DeepPartial<QuizQuestion>,
  ): Promise<QuizQuestion | null>;

  abstract remove(id: QuizQuestion['id']): Promise<void>;
}
