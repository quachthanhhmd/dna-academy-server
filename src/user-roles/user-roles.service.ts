import { RolesService } from '../roles/roles.service';
import { Role } from '../roles/domain/role';

import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserRoleRepository } from './infrastructure/persistence/user-role.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { UserRole } from './domain/user-role';

@Injectable()
export class UserRolesService {
  constructor(
    private readonly roleService: RolesService,

    private readonly userService: UsersService,

    // Dependencies here
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  async create(createUserRoleDto: CreateUserRoleDto) {
    // Do not remove comment below.
    // <creating-property />
    let assignedBy: User | null | undefined = undefined;

    if (createUserRoleDto.assignedBy) {
      const assignedByObject = await this.userService.findById(
        createUserRoleDto.assignedBy.id,
      );
      if (!assignedByObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            assignedBy: 'notExists',
          },
        });
      }
      assignedBy = assignedByObject;
    } else if (createUserRoleDto.assignedBy === null) {
      assignedBy = null;
    }

    const roleObject = await this.roleService.findById(
      createUserRoleDto.role.id,
    );
    if (!roleObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          role: 'notExists',
        },
      });
    }
    const role = roleObject;

    const userObject = await this.userService.findById(
      createUserRoleDto.user.id,
    );
    if (!userObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          user: 'notExists',
        },
      });
    }
    const user = userObject;

    return this.userRoleRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      assignedBy,

      assignedAt: createUserRoleDto.assignedAt ?? new Date(),

      role,

      user,
    });
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

  removeByUserId(userId: UserRole['user']['id']) {
    return this.userRoleRepository.removeByUserId(userId);
  }

  async update(
    id: UserRole['id'],

    updateUserRoleDto: UpdateUserRoleDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let assignedBy: User | null | undefined = undefined;

    if (updateUserRoleDto.assignedBy) {
      const assignedByObject = await this.userService.findById(
        updateUserRoleDto.assignedBy.id,
      );
      if (!assignedByObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            assignedBy: 'notExists',
          },
        });
      }
      assignedBy = assignedByObject;
    } else if (updateUserRoleDto.assignedBy === null) {
      assignedBy = null;
    }

    let role: Role | undefined = undefined;

    if (updateUserRoleDto.role) {
      const roleObject = await this.roleService.findById(
        updateUserRoleDto.role.id,
      );
      if (!roleObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            role: 'notExists',
          },
        });
      }
      role = roleObject;
    }

    let user: User | undefined = undefined;

    if (updateUserRoleDto.user) {
      const userObject = await this.userService.findById(
        updateUserRoleDto.user.id,
      );
      if (!userObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            user: 'notExists',
          },
        });
      }
      user = userObject;
    }

    return this.userRoleRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      assignedBy,

      assignedAt: updateUserRoleDto.assignedAt,

      role,

      user,
    });
  }

  remove(id: UserRole['id']) {
    return this.userRoleRepository.remove(id);
  }
}
