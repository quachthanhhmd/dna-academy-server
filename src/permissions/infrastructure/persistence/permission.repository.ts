import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Permission } from '../../domain/permission';

export abstract class PermissionRepository {
  abstract create(
    data: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Permission>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Permission[]>;

  abstract findById(id: Permission['id']): Promise<NullableType<Permission>>;

  abstract findByIds(ids: Permission['id'][]): Promise<Permission[]>;

  abstract update(
    id: Permission['id'],
    payload: DeepPartial<Permission>,
  ): Promise<Permission | null>;

  abstract remove(id: Permission['id']): Promise<void>;
}
