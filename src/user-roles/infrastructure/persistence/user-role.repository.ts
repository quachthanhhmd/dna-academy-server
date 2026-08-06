import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { UserRole } from '../../domain/user-role';

export abstract class UserRoleRepository {
  abstract create(
    data: Omit<UserRole, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<UserRole>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<UserRole[]>;

  abstract findById(id: UserRole['id']): Promise<NullableType<UserRole>>;

  abstract findByIds(ids: UserRole['id'][]): Promise<UserRole[]>;

  abstract update(
    id: UserRole['id'],
    payload: DeepPartial<UserRole>,
  ): Promise<UserRole | null>;

  abstract remove(id: UserRole['id']): Promise<void>;
}
