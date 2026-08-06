import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateMasterDataGroupDto } from './dto/create-master-data-group.dto';
import { UpdateMasterDataGroupDto } from './dto/update-master-data-group.dto';
import { MasterDataGroupRepository } from './infrastructure/persistence/master-data-group.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { MasterDataGroup } from './domain/master-data-group';

@Injectable()
export class MasterDataGroupsService {
  constructor(
    private readonly userService: UsersService,

    // Dependencies here
    private readonly masterDataGroupRepository: MasterDataGroupRepository,
  ) {}

  async create(createMasterDataGroupDto: CreateMasterDataGroupDto) {
    // Do not remove comment below.
    // <creating-property />
    let createdBy: User | null | undefined = undefined;

    if (createMasterDataGroupDto.createdBy) {
      const createdByObject = await this.userService.findById(
        createMasterDataGroupDto.createdBy.id,
      );
      if (!createdByObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            createdBy: 'notExists',
          },
        });
      }
      createdBy = createdByObject;
    } else if (createMasterDataGroupDto.createdBy === null) {
      createdBy = null;
    }

    return this.masterDataGroupRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      createdBy,

      displayOrder: createMasterDataGroupDto.displayOrder,

      isActive: createMasterDataGroupDto.isActive,

      description: createMasterDataGroupDto.description,

      name: createMasterDataGroupDto.name,

      groupKey: createMasterDataGroupDto.groupKey,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.masterDataGroupRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: MasterDataGroup['id']) {
    return this.masterDataGroupRepository.findById(id);
  }

  findByIds(ids: MasterDataGroup['id'][]) {
    return this.masterDataGroupRepository.findByIds(ids);
  }

  async update(
    id: MasterDataGroup['id'],

    updateMasterDataGroupDto: UpdateMasterDataGroupDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let createdBy: User | null | undefined = undefined;

    if (updateMasterDataGroupDto.createdBy) {
      const createdByObject = await this.userService.findById(
        updateMasterDataGroupDto.createdBy.id,
      );
      if (!createdByObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            createdBy: 'notExists',
          },
        });
      }
      createdBy = createdByObject;
    } else if (updateMasterDataGroupDto.createdBy === null) {
      createdBy = null;
    }

    return this.masterDataGroupRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      createdBy,

      displayOrder: updateMasterDataGroupDto.displayOrder,

      isActive: updateMasterDataGroupDto.isActive,

      description: updateMasterDataGroupDto.description,

      name: updateMasterDataGroupDto.name,

      groupKey: updateMasterDataGroupDto.groupKey,
    });
  }

  remove(id: MasterDataGroup['id']) {
    return this.masterDataGroupRepository.remove(id);
  }
}
