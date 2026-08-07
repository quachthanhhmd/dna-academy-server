import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

import { MasterDataGroupsService } from '../master-data-groups/master-data-groups.service';
import { MasterDataGroup } from '../master-data-groups/domain/master-data-group';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateMasterDataCodeDto } from './dto/create-master-data-code.dto';
import { UpdateMasterDataCodeDto } from './dto/update-master-data-code.dto';
import { MasterDataCodeRepository } from './infrastructure/persistence/master-data-code.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { MasterDataCode } from './domain/master-data-code';

@Injectable()
export class MasterDataCodesService {
  constructor(
    private readonly userService: UsersService,

    private readonly masterDataGroupService: MasterDataGroupsService,

    // Dependencies here
    private readonly masterDataCodeRepository: MasterDataCodeRepository,
  ) {}

  async create(createMasterDataCodeDto: CreateMasterDataCodeDto) {
    // Do not remove comment below.
    // <creating-property />
    let createdBy: User | null | undefined = undefined;

    if (createMasterDataCodeDto.createdBy) {
      const createdByObject = await this.userService.findById(
        createMasterDataCodeDto.createdBy.id,
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
    } else if (createMasterDataCodeDto.createdBy === null) {
      createdBy = null;
    }

    const groupObject = await this.masterDataGroupService.findById(
      createMasterDataCodeDto.group.id,
    );
    if (!groupObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          group: 'notExists',
        },
      });
    }
    const group = groupObject;

    return this.masterDataCodeRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      createdBy,

      displayOrder: createMasterDataCodeDto.displayOrder,

      isActive: createMasterDataCodeDto.isActive,

      thumbnailUrl: createMasterDataCodeDto.thumbnailUrl,

      description: createMasterDataCodeDto.description,

      name: createMasterDataCodeDto.name,

      code: createMasterDataCodeDto.code,

      group,
    });
  }

  findAllWithPagination({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: { groupKey?: string; isActive?: boolean } | null;
    paginationOptions: IPaginationOptions;
  }) {
    return this.masterDataCodeRepository.findAllWithPagination({
      filterOptions,
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: MasterDataCode['id']) {
    return this.masterDataCodeRepository.findById(id);
  }

  findByIds(ids: MasterDataCode['id'][]) {
    return this.masterDataCodeRepository.findByIds(ids);
  }

  findByGroupIdAndName(groupId: string, name: string) {
    return this.masterDataCodeRepository.findByGroupIdAndName(groupId, name);
  }

  async update(
    id: MasterDataCode['id'],

    updateMasterDataCodeDto: UpdateMasterDataCodeDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let createdBy: User | null | undefined = undefined;

    if (updateMasterDataCodeDto.createdBy) {
      const createdByObject = await this.userService.findById(
        updateMasterDataCodeDto.createdBy.id,
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
    } else if (updateMasterDataCodeDto.createdBy === null) {
      createdBy = null;
    }

    let group: MasterDataGroup | undefined = undefined;

    if (updateMasterDataCodeDto.group) {
      const groupObject = await this.masterDataGroupService.findById(
        updateMasterDataCodeDto.group.id,
      );
      if (!groupObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            group: 'notExists',
          },
        });
      }
      group = groupObject;
    }

    return this.masterDataCodeRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      createdBy,

      displayOrder: updateMasterDataCodeDto.displayOrder,

      isActive: updateMasterDataCodeDto.isActive,

      thumbnailUrl: updateMasterDataCodeDto.thumbnailUrl,

      description: updateMasterDataCodeDto.description,

      name: updateMasterDataCodeDto.name,

      code: updateMasterDataCodeDto.code,

      group,
    });
  }

  remove(id: MasterDataCode['id']) {
    return this.masterDataCodeRepository.remove(id);
  }
}
