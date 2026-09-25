import { Injectable } from '@nestjs/common';
import { FormQuestionOption } from './domain/form-question-option';
import { FormQuestionOptionRepository } from './infrastructure/persistence/form-question-option.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { DeepPartial } from '../utils/types/deep-partial.type';

/**
 * EPIC-08 ships no generic CRUD for this resource: the only routes over the
 * forms tables are the public submit/definition/prefill ones and the admin
 * submissions API in `src/forms/`. The service exists so the persistence layer
 * has the shape the rest of the project uses, and is injected where needed.
 */
@Injectable()
export class FormQuestionOptionService {
  constructor(
    private readonly formQuestionOptionRepository: FormQuestionOptionRepository,
  ) {}

  create(
    data: Omit<FormQuestionOption, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormQuestionOption> {
    return this.formQuestionOptionRepository.create(data);
  }

  findAllWithPagination(
    paginationOptions: IPaginationOptions,
  ): Promise<FormQuestionOption[]> {
    return this.formQuestionOptionRepository.findAllWithPagination({
      paginationOptions,
    });
  }

  findById(id: FormQuestionOption['id']): Promise<FormQuestionOption | null> {
    return this.formQuestionOptionRepository.findById(id);
  }

  findByIds(ids: FormQuestionOption['id'][]): Promise<FormQuestionOption[]> {
    return this.formQuestionOptionRepository.findByIds(ids);
  }

  update(
    id: FormQuestionOption['id'],
    payload: DeepPartial<FormQuestionOption>,
  ): Promise<FormQuestionOption | null> {
    return this.formQuestionOptionRepository.update(id, payload);
  }

  remove(id: FormQuestionOption['id']): Promise<void> {
    return this.formQuestionOptionRepository.remove(id);
  }
}
