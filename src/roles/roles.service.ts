import { Injectable } from '@nestjs/common';
import { RoleRepository } from './infrastructure/persistence/role.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Role } from './domain/role';
import { DeepPartial } from '../utils/types/deep-partial.type';

@Injectable()
export class RolesService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async create(data: Omit<Role, 'id'>) {
    // RoleEntity.id is a manually-assigned integer PK (not auto-increment) —
    // reserved for the boilerplate's static Admin/User/Super Admin ids.
    const id = await this.roleRepository.getNextId();

    return this.roleRepository.create({ ...data, id });
  }

  findByName(name: Role['name']) {
    return this.roleRepository.findByName(name);
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
