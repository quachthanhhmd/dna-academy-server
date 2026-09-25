import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { FormDefinition } from '../../domain/form-definition';

export abstract class FormDefinitionRepository {
  abstract create(
    data: Omit<FormDefinition, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormDefinition>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormDefinition[]>;

  abstract findById(
    id: FormDefinition['id'],
  ): Promise<NullableType<FormDefinition>>;

  abstract findByIds(ids: FormDefinition['id'][]): Promise<FormDefinition[]>;

  abstract update(
    id: FormDefinition['id'],
    payload: DeepPartial<FormDefinition>,
  ): Promise<FormDefinition | null>;

  abstract remove(id: FormDefinition['id']): Promise<void>;
}
