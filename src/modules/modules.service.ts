import {
  // common
  Injectable,
} from '@nestjs/common';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModuleRepository } from './infrastructure/persistence/module.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Module } from './domain/module';

@Injectable()
export class ModulesService {
  constructor(
    // Dependencies here
    private readonly moduleRepository: ModuleRepository,
  ) {}

  async create(createModuleDto: CreateModuleDto) {
    // Do not remove comment below.
    // <creating-property />

    return this.moduleRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      label: createModuleDto.label,

      name: createModuleDto.name,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.moduleRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Module['id']) {
    return this.moduleRepository.findById(id);
  }

  findByIds(ids: Module['id'][]) {
    return this.moduleRepository.findByIds(ids);
  }

  async update(
    id: Module['id'],

    updateModuleDto: UpdateModuleDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    return this.moduleRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      label: updateModuleDto.label,

      name: updateModuleDto.name,
    });
  }

  remove(id: Module['id']) {
    return this.moduleRepository.remove(id);
  }
}
