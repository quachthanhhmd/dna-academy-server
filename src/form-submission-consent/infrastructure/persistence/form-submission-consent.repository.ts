import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { FormSubmissionConsent } from '../../domain/form-submission-consent';

export abstract class FormSubmissionConsentRepository {
  abstract create(
    data: Omit<FormSubmissionConsent, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormSubmissionConsent>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormSubmissionConsent[]>;

  abstract findById(
    id: FormSubmissionConsent['id'],
  ): Promise<NullableType<FormSubmissionConsent>>;

  abstract findByIds(
    ids: FormSubmissionConsent['id'][],
  ): Promise<FormSubmissionConsent[]>;

  abstract update(
    id: FormSubmissionConsent['id'],
    payload: DeepPartial<FormSubmissionConsent>,
  ): Promise<FormSubmissionConsent | null>;

  abstract remove(id: FormSubmissionConsent['id']): Promise<void>;
}
