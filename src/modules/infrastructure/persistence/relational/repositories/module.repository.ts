import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ModuleEntity } from '../entities/module.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Module } from '../../../../domain/module';
import { ModuleRepository } from '../../module.repository';
import { ModuleMapper } from '../mappers/module.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class ModuleRelationalRepository implements ModuleRepository {
  constructor(
    @InjectRepository(ModuleEntity)
    private readonly moduleRepository: Repository<ModuleEntity>,
  ) {}

  async create(data: Module): Promise<Module> {
    const persistenceModel = ModuleMapper.toPersistence(data);
    const newEntity = await this.moduleRepository.save(
      this.moduleRepository.create(persistenceModel),
    );
    return ModuleMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Module[]> {
    const entities = await this.moduleRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => ModuleMapper.toDomain(entity));
  }

  async findById(id: Module['id']): Promise<NullableType<Module>> {
    const entity = await this.moduleRepository.findOne({
      where: { id },
    });

    return entity ? ModuleMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Module['id'][]): Promise<Module[]> {
    const entities = await this.moduleRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => ModuleMapper.toDomain(entity));
  }

  async update(id: Module['id'], payload: Partial<Module>): Promise<Module> {
    const entity = await this.moduleRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.moduleRepository.save(
      this.moduleRepository.create(
        ModuleMapper.toPersistence({
          ...ModuleMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return ModuleMapper.toDomain(updatedEntity);
  }

  async remove(id: Module['id']): Promise<void> {
    await this.moduleRepository.delete(id);
  }
}
