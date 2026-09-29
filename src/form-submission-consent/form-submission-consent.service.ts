import { Injectable } from '@nestjs/common';
import { FormSubmissionConsent } from './domain/form-submission-consent';
import { FormSubmissionConsentRepository } from './infrastructure/persistence/form-submission-consent.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { DeepPartial } from '../utils/types/deep-partial.type';

/**
 * EPIC-08 ships no generic CRUD for this resource: the only routes over the
 * forms tables are the public submit/definition/prefill ones and the admin
 * submissions API in `src/forms/`. The service exists so the persistence layer
 * has the shape the rest of the project uses, and is injected where needed.
 */
@Injectable()
export class FormSubmissionConsentService {
  constructor(
    private readonly formSubmissionConsentRepository: FormSubmissionConsentRepository,
  ) {}

  create(
    data: Omit<FormSubmissionConsent, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormSubmissionConsent> {
    return this.formSubmissionConsentRepository.create(data);
  }

  findAllWithPagination(
    paginationOptions: IPaginationOptions,
  ): Promise<FormSubmissionConsent[]> {
    return this.formSubmissionConsentRepository.findAllWithPagination({
      paginationOptions,
    });
  }

  findById(
    id: FormSubmissionConsent['id'],
  ): Promise<FormSubmissionConsent | null> {
    return this.formSubmissionConsentRepository.findById(id);
  }

  findByIds(
    ids: FormSubmissionConsent['id'][],
  ): Promise<FormSubmissionConsent[]> {
    return this.formSubmissionConsentRepository.findByIds(ids);
  }

  update(
    id: FormSubmissionConsent['id'],
    payload: DeepPartial<FormSubmissionConsent>,
  ): Promise<FormSubmissionConsent | null> {
    return this.formSubmissionConsentRepository.update(id, payload);
  }

  remove(id: FormSubmissionConsent['id']): Promise<void> {
    return this.formSubmissionConsentRepository.remove(id);
  }
}
