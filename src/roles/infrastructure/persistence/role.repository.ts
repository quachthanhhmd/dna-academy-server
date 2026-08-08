import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Role } from '../../domain/role';

export abstract class RoleRepository {
  /** RoleEntity.id is a manually-assigned integer PK — callers must supply it (see getNextId). */
  abstract create(data: Role): Promise<Role>;

  abstract findByName(name: Role['name']): Promise<NullableType<Role>>;

  /** RoleEntity.id is a manually-assigned integer PK (not auto-increment). */
  abstract getNextId(): Promise<number>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Role[]>;

  abstract findById(id: Role['id']): Promise<NullableType<Role>>;

  abstract findByIds(ids: Role['id'][]): Promise<Role[]>;

  abstract update(
    id: Role['id'],
    payload: DeepPartial<Role>,
  ): Promise<Role | null>;

  abstract remove(id: Role['id']): Promise<void>;
}
