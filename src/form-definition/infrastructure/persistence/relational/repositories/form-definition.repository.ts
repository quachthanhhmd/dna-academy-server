import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { NotFoundException, HttpStatus } from '@nestjs/common';
import { DeepPartial } from '../../../../../utils/types/deep-partial.type';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { FormDefinition } from '../../../../domain/form-definition';
import { FormDefinitionRepository } from '../../form-definition.repository';
import { FormDefinitionEntity } from '../entities/form-definition.entity';
import { FormDefinitionMapper } from '../mappers/form-definition.mapper';

@Injectable()
export class FormDefinitionRelationalRepository implements FormDefinitionRepository {
  constructor(
    @InjectRepository(FormDefinitionEntity)
    private readonly repository: Repository<FormDefinitionEntity>,
  ) {}

  async create(
    data: Omit<FormDefinition, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormDefinition> {
    const persistenceModel = FormDefinitionMapper.toPersistence(
      data as FormDefinition,
    );
    const newEntity = await this.repository.save(
      this.repository.create(persistenceModel),
    );
    return FormDefinitionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormDefinition[]> {
    const entities = await this.repository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => FormDefinitionMapper.toDomain(entity));
  }

  async findById(
    id: FormDefinition['id'],
  ): Promise<NullableType<FormDefinition>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? FormDefinitionMapper.toDomain(entity) : null;
  }

  async findByIds(ids: FormDefinition['id'][]): Promise<FormDefinition[]> {
    const entities = await this.repository.find({ where: { id: In(ids) } });
    return entities.map((entity) => FormDefinitionMapper.toDomain(entity));
  }

  async update(
    id: FormDefinition['id'],
    payload: DeepPartial<FormDefinition>,
  ): Promise<FormDefinition> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `form_definitionNotFound`,
      });
    }

    const updatedEntity = await this.repository.save(
      this.repository.create(
        FormDefinitionMapper.toPersistence({
          ...FormDefinitionMapper.toDomain(entity),
          ...payload,
        } as FormDefinition),
      ),
    );

    return FormDefinitionMapper.toDomain(updatedEntity);
  }

  async remove(id: FormDefinition['id']): Promise<void> {
    await this.repository.delete(id);
  }
}
