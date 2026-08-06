import { Injectable } from '@nestjs/common';
import { RoleRepository } from './infrastructure/persistence/role.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Role } from './domain/role';
import { DeepPartial } from '../utils/types/deep-partial.type';

@Injectable()
export class RolesService {
  constructor(private readonly roleRepository: RoleRepository) {}

  create(data: Omit<Role, 'id'>) {
    return this.roleRepository.create(data);
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.roleRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Role['id']) {
    return this.roleRepository.findById(id);
  }

  findByIds(ids: Role['id'][]) {
    return this.roleRepository.findByIds(ids);
  }

  update(id: Role['id'], payload: DeepPartial<Role>) {
    return this.roleRepository.update(id, payload);
  }

  remove(id: Role['id']) {
    return this.roleRepository.remove(id);
  }
}
