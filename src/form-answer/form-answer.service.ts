import { Injectable } from '@nestjs/common';
import { FormAnswer } from './domain/form-answer';
import { FormAnswerRepository } from './infrastructure/persistence/form-answer.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { DeepPartial } from '../utils/types/deep-partial.type';

/**
 * EPIC-08 ships no generic CRUD for this resource: the only routes over the
 * forms tables are the public submit/definition/prefill ones and the admin
 * submissions API in `src/forms/`. The service exists so the persistence layer
 * has the shape the rest of the project uses, and is injected where needed.
 */
@Injectable()
export class FormAnswerService {
  constructor(private readonly formAnswerRepository: FormAnswerRepository) {}

  create(
    data: Omit<FormAnswer, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormAnswer> {
    return this.formAnswerRepository.create(data);
  }

  findAllWithPagination(
    paginationOptions: IPaginationOptions,
  ): Promise<FormAnswer[]> {
    return this.formAnswerRepository.findAllWithPagination({
      paginationOptions,
    });
  }

  findById(id: FormAnswer['id']): Promise<FormAnswer | null> {
    return this.formAnswerRepository.findById(id);
  }

  findByIds(ids: FormAnswer['id'][]): Promise<FormAnswer[]> {
    return this.formAnswerRepository.findByIds(ids);
  }

  update(
    id: FormAnswer['id'],
    payload: DeepPartial<FormAnswer>,
  ): Promise<FormAnswer | null> {
    return this.formAnswerRepository.update(id, payload);
  }

  remove(id: FormAnswer['id']): Promise<void> {
    return this.formAnswerRepository.remove(id);
  }
}
