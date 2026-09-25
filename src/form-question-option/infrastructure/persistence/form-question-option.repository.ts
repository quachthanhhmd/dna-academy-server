import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { FormQuestionOption } from '../../domain/form-question-option';

export abstract class FormQuestionOptionRepository {
  abstract create(
    data: Omit<FormQuestionOption, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormQuestionOption>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormQuestionOption[]>;

  abstract findById(
    id: FormQuestionOption['id'],
  ): Promise<NullableType<FormQuestionOption>>;

  abstract findByIds(
    ids: FormQuestionOption['id'][],
  ): Promise<FormQuestionOption[]>;

  abstract update(
    id: FormQuestionOption['id'],
    payload: DeepPartial<FormQuestionOption>,
  ): Promise<FormQuestionOption | null>;

  abstract remove(id: FormQuestionOption['id']): Promise<void>;
}
