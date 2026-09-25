import { Injectable } from '@nestjs/common';
import { FormDefinition } from './domain/form-definition';
import { FormDefinitionRepository } from './infrastructure/persistence/form-definition.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { DeepPartial } from '../utils/types/deep-partial.type';

/**
 * EPIC-08 ships no generic CRUD for this resource: the only routes over the
 * forms tables are the public submit/definition/prefill ones and the admin
 * submissions API in `src/forms/`. The service exists so the persistence layer
 * has the shape the rest of the project uses, and is injected where needed.
 */
@Injectable()
export class FormDefinitionService {
  constructor(
    private readonly formDefinitionRepository: FormDefinitionRepository,
  ) {}

  create(
    data: Omit<FormDefinition, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormDefinition> {
    return this.formDefinitionRepository.create(data);
  }

  findAllWithPagination(
    paginationOptions: IPaginationOptions,
  ): Promise<FormDefinition[]> {
    return this.formDefinitionRepository.findAllWithPagination({
      paginationOptions,
    });
  }

  findById(id: FormDefinition['id']): Promise<FormDefinition | null> {
    return this.formDefinitionRepository.findById(id);
  }

  findByIds(ids: FormDefinition['id'][]): Promise<FormDefinition[]> {
    return this.formDefinitionRepository.findByIds(ids);
  }

  update(
    id: FormDefinition['id'],
    payload: DeepPartial<FormDefinition>,
  ): Promise<FormDefinition | null> {
    return this.formDefinitionRepository.update(id, payload);
  }

  remove(id: FormDefinition['id']): Promise<void> {
    return this.formDefinitionRepository.remove(id);
  }
}
