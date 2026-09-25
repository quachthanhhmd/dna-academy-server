import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { FormSubmissionEvent } from '../../domain/form-submission-event';

export abstract class FormSubmissionEventRepository {
  abstract create(
    data: Omit<FormSubmissionEvent, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormSubmissionEvent>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormSubmissionEvent[]>;

  abstract findById(
    id: FormSubmissionEvent['id'],
  ): Promise<NullableType<FormSubmissionEvent>>;

  abstract findByIds(
    ids: FormSubmissionEvent['id'][],
  ): Promise<FormSubmissionEvent[]>;

  abstract update(
    id: FormSubmissionEvent['id'],
    payload: DeepPartial<FormSubmissionEvent>,
  ): Promise<FormSubmissionEvent | null>;

  abstract remove(id: FormSubmissionEvent['id']): Promise<void>;
}
