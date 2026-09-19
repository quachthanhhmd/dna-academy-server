import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { RolesService } from '../roles/roles.service';
import { UserRoleRepository } from './infrastructure/persistence/user-role.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { UserRole } from './domain/user-role';

/**
 * A user's role (permission model §2.5).
 *
 * `setRole` is the only way a role is written — registration, social sign-up,
 * the role endpoint, instructor accounts and the seeds all come through it.
 * The generated create/update/remove it replaces could leave a user with
 * several roles, or with `user_role` and `user.role_id` disagreeing.
 */
@Injectable()
export class UserRolesService {
  constructor(
    private readonly roleService: RolesService,
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  async setRole(
    userId: UserRole['user']['id'],
    roleId: UserRole['role']['id'],
    assignedById: UserRole['user']['id'] | null,
    manager?: EntityManager,
  ): Promise<void> {
    const role = await this.roleService.findById(roleId);

    if (!role) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { roleId: 'notExists' },
      });
    }

    await this.userRoleRepository.setRole(
      userId,
      roleId,
      assignedById,
      manager,
    );
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.userRoleRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: UserRole['id']) {
    return this.userRoleRepository.findById(id);
  }

  findByIds(ids: UserRole['id'][]) {
    return this.userRoleRepository.findByIds(ids);
  }

  findByUserId(userId: UserRole['user']['id']) {
    return this.userRoleRepository.findByUserId(userId);
  }

  countByRoleId(roleId: UserRole['role']['id']) {
    return this.userRoleRepository.countByRoleId(roleId);
  }
}
