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
import {
  sanitizeTranslations,
  withDefaultLocale,
} from '../utils/i18n/translations';
import { DeepPartial } from '../utils/types/deep-partial.type';

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
      nameTranslations: withDefaultLocale(
        sanitizeTranslations(createMasterDataGroupDto.nameTranslations),
        createMasterDataGroupDto.name,
      ),

      descriptionTranslations: withDefaultLocale(
        sanitizeTranslations(createMasterDataGroupDto.descriptionTranslations),
        createMasterDataGroupDto.description,
      ),

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

  findByGroupKey(groupKey: MasterDataGroup['groupKey']) {
    return this.masterDataGroupRepository.findByGroupKey(groupKey);
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

    const payload: DeepPartial<MasterDataGroup> = {
      // Do not remove comment below.
      // <updating-property-payload />
      nameTranslations: updateMasterDataGroupDto.nameTranslations,

      descriptionTranslations: updateMasterDataGroupDto.descriptionTranslations,

      createdBy,

      displayOrder: updateMasterDataGroupDto.displayOrder,

      isActive: updateMasterDataGroupDto.isActive,

      description: updateMasterDataGroupDto.description,

      name: updateMasterDataGroupDto.name,

      groupKey: updateMasterDataGroupDto.groupKey,
    };

    // A partial update DTO carries every declared field as an own
    // property (undefined when the caller omitted it), and the
    // repository merges `{ ...current, ...payload }`. Strip the
    // undefined keys so an untouched column — notably the Epic 6
    // translation maps, which are NOT NULL with a CHECK constraint —
    // cannot be clobbered.
    for (const key of Object.keys(payload) as (keyof MasterDataGroup)[]) {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    }

    return this.masterDataGroupRepository.update(id, payload);
  }

  remove(id: MasterDataGroup['id']) {
    return this.masterDataGroupRepository.remove(id);
  }
}
