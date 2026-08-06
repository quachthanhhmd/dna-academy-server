import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Module } from '../../domain/module';

export abstract class ModuleRepository {
  abstract create(
    data: Omit<Module, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Module>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Module[]>;

  abstract findById(id: Module['id']): Promise<NullableType<Module>>;

  abstract findByIds(ids: Module['id'][]): Promise<Module[]>;

  abstract update(
    id: Module['id'],
    payload: DeepPartial<Module>,
  ): Promise<Module | null>;

  abstract remove(id: Module['id']): Promise<void>;
}
