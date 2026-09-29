import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { FormQuestion } from '../../domain/form-question';

export abstract class FormQuestionRepository {
  abstract create(
    data: Omit<FormQuestion, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormQuestion>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormQuestion[]>;

  abstract findById(
    id: FormQuestion['id'],
  ): Promise<NullableType<FormQuestion>>;

  abstract findByIds(ids: FormQuestion['id'][]): Promise<FormQuestion[]>;

  abstract update(
    id: FormQuestion['id'],
    payload: DeepPartial<FormQuestion>,
  ): Promise<FormQuestion | null>;

  abstract remove(id: FormQuestion['id']): Promise<void>;
}
