import { Injectable } from '@nestjs/common';
import { FormSubmissionEvent } from './domain/form-submission-event';
import { FormSubmissionEventRepository } from './infrastructure/persistence/form-submission-event.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { DeepPartial } from '../utils/types/deep-partial.type';

/**
 * EPIC-08 ships no generic CRUD for this resource: the only routes over the
 * forms tables are the public submit/definition/prefill ones and the admin
 * submissions API in `src/forms/`. The service exists so the persistence layer
 * has the shape the rest of the project uses, and is injected where needed.
 */
@Injectable()
export class FormSubmissionEventService {
  constructor(
    private readonly formSubmissionEventRepository: FormSubmissionEventRepository,
  ) {}

  create(
    data: Omit<FormSubmissionEvent, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormSubmissionEvent> {
    return this.formSubmissionEventRepository.create(data);
  }

  findAllWithPagination(
    paginationOptions: IPaginationOptions,
  ): Promise<FormSubmissionEvent[]> {
    return this.formSubmissionEventRepository.findAllWithPagination({
      paginationOptions,
    });
  }

  findById(id: FormSubmissionEvent['id']): Promise<FormSubmissionEvent | null> {
    return this.formSubmissionEventRepository.findById(id);
  }

  findByIds(ids: FormSubmissionEvent['id'][]): Promise<FormSubmissionEvent[]> {
    return this.formSubmissionEventRepository.findByIds(ids);
  }

  update(
    id: FormSubmissionEvent['id'],
    payload: DeepPartial<FormSubmissionEvent>,
  ): Promise<FormSubmissionEvent | null> {
    return this.formSubmissionEventRepository.update(id, payload);
  }

  remove(id: FormSubmissionEvent['id']): Promise<void> {
    return this.formSubmissionEventRepository.remove(id);
  }
}
