import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { FormAnswerOption } from '../../domain/form-answer-option';

export abstract class FormAnswerOptionRepository {
  abstract create(
    data: Omit<FormAnswerOption, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormAnswerOption>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormAnswerOption[]>;

  abstract findById(
    id: FormAnswerOption['id'],
  ): Promise<NullableType<FormAnswerOption>>;

  abstract findByIds(
    ids: FormAnswerOption['id'][],
  ): Promise<FormAnswerOption[]>;

  abstract update(
    id: FormAnswerOption['id'],
    payload: DeepPartial<FormAnswerOption>,
  ): Promise<FormAnswerOption | null>;

  abstract remove(id: FormAnswerOption['id']): Promise<void>;
}
