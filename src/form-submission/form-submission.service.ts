import { Injectable } from '@nestjs/common';
import { FormSubmission } from './domain/form-submission';
import { FormSubmissionRepository } from './infrastructure/persistence/form-submission.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { DeepPartial } from '../utils/types/deep-partial.type';

/**
 * EPIC-08 ships no generic CRUD for this resource: the only routes over the
 * forms tables are the public submit/definition/prefill ones and the admin
 * submissions API in `src/forms/`. The service exists so the persistence layer
 * has the shape the rest of the project uses, and is injected where needed.
 */
@Injectable()
export class FormSubmissionService {
  constructor(
    private readonly formSubmissionRepository: FormSubmissionRepository,
  ) {}

  create(
    data: Omit<FormSubmission, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormSubmission> {
    return this.formSubmissionRepository.create(data);
  }

  findAllWithPagination(
    paginationOptions: IPaginationOptions,
  ): Promise<FormSubmission[]> {
    return this.formSubmissionRepository.findAllWithPagination({
      paginationOptions,
    });
  }

  findById(id: FormSubmission['id']): Promise<FormSubmission | null> {
    return this.formSubmissionRepository.findById(id);
  }

  findByIds(ids: FormSubmission['id'][]): Promise<FormSubmission[]> {
    return this.formSubmissionRepository.findByIds(ids);
  }

  update(
    id: FormSubmission['id'],
    payload: DeepPartial<FormSubmission>,
  ): Promise<FormSubmission | null> {
    return this.formSubmissionRepository.update(id, payload);
  }

  remove(id: FormSubmission['id']): Promise<void> {
    return this.formSubmissionRepository.remove(id);
  }
}
