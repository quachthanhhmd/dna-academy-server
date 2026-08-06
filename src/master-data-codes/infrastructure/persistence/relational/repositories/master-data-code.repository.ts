import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository, In } from 'typeorm';
import { MasterDataCodeEntity } from '../entities/master-data-code.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { MasterDataCode } from '../../../../domain/master-data-code';
import { MasterDataCodeRepository } from '../../master-data-code.repository';
import { MasterDataCodeMapper } from '../mappers/master-data-code.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class MasterDataCodeRelationalRepository implements MasterDataCodeRepository {
  constructor(
    @InjectRepository(MasterDataCodeEntity)
    private readonly masterDataCodeRepository: Repository<MasterDataCodeEntity>,
  ) {}

  async create(data: MasterDataCode): Promise<MasterDataCode> {
    const persistenceModel = MasterDataCodeMapper.toPersistence(data);
    const newEntity = await this.masterDataCodeRepository.save(
      this.masterDataCodeRepository.create(persistenceModel),
    );
    return MasterDataCodeMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: { groupKey?: string } | null;
    paginationOptions: IPaginationOptions;
  }): Promise<MasterDataCode[]> {
    const where: FindOptionsWhere<MasterDataCodeEntity> = {};

    if (filterOptions?.groupKey) {
      where.group = { groupKey: filterOptions.groupKey };
    }

    const entities = await this.masterDataCodeRepository.find({
      where,
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      order: { displayOrder: 'ASC' },
    });

    return entities.map((entity) => MasterDataCodeMapper.toDomain(entity));
  }

  async findById(
    id: MasterDataCode['id'],
  ): Promise<NullableType<MasterDataCode>> {
    const entity = await this.masterDataCodeRepository.findOne({
      where: { id },
    });

    return entity ? MasterDataCodeMapper.toDomain(entity) : null;
  }

  async findByIds(ids: MasterDataCode['id'][]): Promise<MasterDataCode[]> {
    const entities = await this.masterDataCodeRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => MasterDataCodeMapper.toDomain(entity));
  }

  async update(
    id: MasterDataCode['id'],
    payload: Partial<MasterDataCode>,
  ): Promise<MasterDataCode> {
    const entity = await this.masterDataCodeRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.masterDataCodeRepository.save(
      this.masterDataCodeRepository.create(
        MasterDataCodeMapper.toPersistence({
          ...MasterDataCodeMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return MasterDataCodeMapper.toDomain(updatedEntity);
  }

  async remove(id: MasterDataCode['id']): Promise<void> {
    await this.masterDataCodeRepository.delete(id);
  }
}
