import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { RolePermission } from '../../domain/role-permission';

export abstract class RolePermissionRepository {
  abstract create(
    data: Omit<RolePermission, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<RolePermission>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<RolePermission[]>;

  abstract findById(
    id: RolePermission['id'],
  ): Promise<NullableType<RolePermission>>;

  abstract findByIds(ids: RolePermission['id'][]): Promise<RolePermission[]>;

  abstract findByRoleId(
    roleId: RolePermission['role']['id'],
  ): Promise<RolePermission[]>;

  abstract removeByRoleId(roleId: RolePermission['role']['id']): Promise<void>;

  abstract update(
    id: RolePermission['id'],
    payload: DeepPartial<RolePermission>,
  ): Promise<RolePermission | null>;

  abstract remove(id: RolePermission['id']): Promise<void>;
}
