import { EntityManager } from 'typeorm';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { UserRole } from '../../domain/user-role';

export abstract class UserRoleRepository {
  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<UserRole[]>;

  abstract findById(id: UserRole['id']): Promise<NullableType<UserRole>>;

  abstract findByIds(ids: UserRole['id'][]): Promise<UserRole[]>;

  abstract findByUserId(userId: UserRole['user']['id']): Promise<UserRole[]>;

  abstract countByRoleId(roleId: UserRole['role']['id']): Promise<number>;

  /**
   * Gives `userId` exactly one role — `roleId` — and mirrors it onto the
   * legacy `user.role_id`, atomically. The only writer of either column
   * (permission model §2.5).
   *
   * Runs on `manager` when given, so a caller creating the account in its own
   * transaction gets the role inside it; otherwise opens one.
   */
  abstract setRole(
    userId: UserRole['user']['id'],
    roleId: UserRole['role']['id'],
    assignedById: UserRole['user']['id'] | null,
    manager?: EntityManager,
  ): Promise<void>;
}
