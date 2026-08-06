import { ModulesService } from '../modules/modules.service';
import { Module } from '../modules/domain/module';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionRepository } from './infrastructure/persistence/permission.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Permission } from './domain/permission';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly moduleService: ModulesService,

    // Dependencies here
    private readonly permissionRepository: PermissionRepository,
  ) {}

  async create(createPermissionDto: CreatePermissionDto) {
    // Do not remove comment below.
    // <creating-property />

    const moduleObject = await this.moduleService.findById(
      createPermissionDto.module.id,
    );
    if (!moduleObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          module: 'notExists',
        },
      });
    }
    const module = moduleObject;

    return this.permissionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      label: createPermissionDto.label,

      action: createPermissionDto.action,

      module,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.permissionRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Permission['id']) {
    return this.permissionRepository.findById(id);
  }

  findByIds(ids: Permission['id'][]) {
    return this.permissionRepository.findByIds(ids);
  }

  async update(
    id: Permission['id'],

    updatePermissionDto: UpdatePermissionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let module: Module | undefined = undefined;

    if (updatePermissionDto.module) {
      const moduleObject = await this.moduleService.findById(
        updatePermissionDto.module.id,
      );
      if (!moduleObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            module: 'notExists',
          },
        });
      }
      module = moduleObject;
    }

    return this.permissionRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      label: updatePermissionDto.label,

      action: updatePermissionDto.action,

      module,
    });
  }

  remove(id: Permission['id']) {
    return this.permissionRepository.remove(id);
  }
}
