import { Injectable } from '@nestjs/common';
import { FormQuestion } from './domain/form-question';
import { FormQuestionRepository } from './infrastructure/persistence/form-question.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { DeepPartial } from '../utils/types/deep-partial.type';

/**
 * EPIC-08 ships no generic CRUD for this resource: the only routes over the
 * forms tables are the public submit/definition/prefill ones and the admin
 * submissions API in `src/forms/`. The service exists so the persistence layer
 * has the shape the rest of the project uses, and is injected where needed.
 */
@Injectable()
export class FormQuestionService {
  constructor(
    private readonly formQuestionRepository: FormQuestionRepository,
  ) {}

  create(
    data: Omit<FormQuestion, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormQuestion> {
    return this.formQuestionRepository.create(data);
  }

  findAllWithPagination(
    paginationOptions: IPaginationOptions,
  ): Promise<FormQuestion[]> {
    return this.formQuestionRepository.findAllWithPagination({
      paginationOptions,
    });
  }

  findById(id: FormQuestion['id']): Promise<FormQuestion | null> {
    return this.formQuestionRepository.findById(id);
  }

  findByIds(ids: FormQuestion['id'][]): Promise<FormQuestion[]> {
    return this.formQuestionRepository.findByIds(ids);
  }

  update(
    id: FormQuestion['id'],
    payload: DeepPartial<FormQuestion>,
  ): Promise<FormQuestion | null> {
    return this.formQuestionRepository.update(id, payload);
  }

  remove(id: FormQuestion['id']): Promise<void> {
    return this.formQuestionRepository.remove(id);
  }
}
