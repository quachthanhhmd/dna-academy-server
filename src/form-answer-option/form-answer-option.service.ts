import { Injectable } from '@nestjs/common';
import { FormAnswerOption } from './domain/form-answer-option';
import { FormAnswerOptionRepository } from './infrastructure/persistence/form-answer-option.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { DeepPartial } from '../utils/types/deep-partial.type';

/**
 * EPIC-08 ships no generic CRUD for this resource: the only routes over the
 * forms tables are the public submit/definition/prefill ones and the admin
 * submissions API in `src/forms/`. The service exists so the persistence layer
 * has the shape the rest of the project uses, and is injected where needed.
 */
@Injectable()
export class FormAnswerOptionService {
  constructor(
    private readonly formAnswerOptionRepository: FormAnswerOptionRepository,
  ) {}

  create(
    data: Omit<FormAnswerOption, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormAnswerOption> {
    return this.formAnswerOptionRepository.create(data);
  }

  findAllWithPagination(
    paginationOptions: IPaginationOptions,
  ): Promise<FormAnswerOption[]> {
    return this.formAnswerOptionRepository.findAllWithPagination({
      paginationOptions,
    });
  }

  findById(id: FormAnswerOption['id']): Promise<FormAnswerOption | null> {
    return this.formAnswerOptionRepository.findById(id);
  }

  findByIds(ids: FormAnswerOption['id'][]): Promise<FormAnswerOption[]> {
    return this.formAnswerOptionRepository.findByIds(ids);
  }

  update(
    id: FormAnswerOption['id'],
    payload: DeepPartial<FormAnswerOption>,
  ): Promise<FormAnswerOption | null> {
    return this.formAnswerOptionRepository.update(id, payload);
  }

  remove(id: FormAnswerOption['id']): Promise<void> {
    return this.formAnswerOptionRepository.remove(id);
  }
}
