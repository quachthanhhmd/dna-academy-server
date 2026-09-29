import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { FormSubmission } from '../../domain/form-submission';

export abstract class FormSubmissionRepository {
  abstract create(
    data: Omit<FormSubmission, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormSubmission>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormSubmission[]>;

  abstract findById(
    id: FormSubmission['id'],
  ): Promise<NullableType<FormSubmission>>;

  abstract findByIds(ids: FormSubmission['id'][]): Promise<FormSubmission[]>;

  abstract update(
    id: FormSubmission['id'],
    payload: DeepPartial<FormSubmission>,
  ): Promise<FormSubmission | null>;

  abstract remove(id: FormSubmission['id']): Promise<void>;
}
