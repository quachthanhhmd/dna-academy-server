import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { ReflectionQuestion } from '../../domain/reflection-question';

export abstract class ReflectionQuestionRepository {
  abstract create(
    data: Omit<ReflectionQuestion, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ReflectionQuestion>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<ReflectionQuestion[]>;

  abstract findById(
    id: ReflectionQuestion['id'],
  ): Promise<NullableType<ReflectionQuestion>>;

  abstract findByIds(
    ids: ReflectionQuestion['id'][],
  ): Promise<ReflectionQuestion[]>;

  abstract update(
    id: ReflectionQuestion['id'],
    payload: DeepPartial<ReflectionQuestion>,
  ): Promise<ReflectionQuestion | null>;

  abstract remove(id: ReflectionQuestion['id']): Promise<void>;
}
