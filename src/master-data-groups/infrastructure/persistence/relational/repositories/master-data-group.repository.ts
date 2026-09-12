import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MasterDataGroupEntity } from '../entities/master-data-group.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { MasterDataGroup } from '../../../../domain/master-data-group';
import { MasterDataGroupRepository } from '../../master-data-group.repository';
import { MasterDataGroupMapper } from '../mappers/master-data-group.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class MasterDataGroupRelationalRepository implements MasterDataGroupRepository {
  constructor(
    @InjectRepository(MasterDataGroupEntity)
    private readonly masterDataGroupRepository: Repository<MasterDataGroupEntity>,
  ) {}

  async create(data: MasterDataGroup): Promise<MasterDataGroup> {
    const persistenceModel = MasterDataGroupMapper.toPersistence(data);
    const newEntity = await this.masterDataGroupRepository.save(
      this.masterDataGroupRepository.create(persistenceModel),
    );
    return MasterDataGroupMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<MasterDataGroup[]> {
    const entities = await this.masterDataGroupRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => MasterDataGroupMapper.toDomain(entity));
  }

  async findById(
    id: MasterDataGroup['id'],
  ): Promise<NullableType<MasterDataGroup>> {
    const entity = await this.masterDataGroupRepository.findOne({
      where: { id },
    });

    return entity ? MasterDataGroupMapper.toDomain(entity) : null;
  }

  async findByIds(ids: MasterDataGroup['id'][]): Promise<MasterDataGroup[]> {
    const entities = await this.masterDataGroupRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => MasterDataGroupMapper.toDomain(entity));
  }

  async findByGroupKey(
    groupKey: MasterDataGroup['groupKey'],
  ): Promise<NullableType<MasterDataGroup>> {
    const entity = await this.masterDataGroupRepository.findOne({
      where: { groupKey },
    });

    return entity ? MasterDataGroupMapper.toDomain(entity) : null;
  }

  async update(
    id: MasterDataGroup['id'],
    payload: Partial<MasterDataGroup>,
  ): Promise<MasterDataGroup> {
    const entity = await this.masterDataGroupRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.masterDataGroupRepository.save(
      this.masterDataGroupRepository.create(
        MasterDataGroupMapper.toPersistence({
          ...MasterDataGroupMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return MasterDataGroupMapper.toDomain(updatedEntity);
  }

  async remove(id: MasterDataGroup['id']): Promise<void> {
    await this.masterDataGroupRepository.delete(id);
  }
}
