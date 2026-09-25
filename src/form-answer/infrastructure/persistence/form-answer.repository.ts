import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { FormAnswer } from '../../domain/form-answer';

export abstract class FormAnswerRepository {
  abstract create(
    data: Omit<FormAnswer, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormAnswer>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormAnswer[]>;

  abstract findById(id: FormAnswer['id']): Promise<NullableType<FormAnswer>>;

  abstract findByIds(ids: FormAnswer['id'][]): Promise<FormAnswer[]>;

  abstract update(
    id: FormAnswer['id'],
    payload: DeepPartial<FormAnswer>,
  ): Promise<FormAnswer | null>;

  abstract remove(id: FormAnswer['id']): Promise<void>;
}
