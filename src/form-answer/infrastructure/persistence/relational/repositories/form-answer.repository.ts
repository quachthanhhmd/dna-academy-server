import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { NotFoundException, HttpStatus } from '@nestjs/common';
import { DeepPartial } from '../../../../../utils/types/deep-partial.type';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { FormAnswer } from '../../../../domain/form-answer';
import { FormAnswerRepository } from '../../form-answer.repository';
import { FormAnswerEntity } from '../entities/form-answer.entity';
import { FormAnswerMapper } from '../mappers/form-answer.mapper';

@Injectable()
export class FormAnswerRelationalRepository implements FormAnswerRepository {
  constructor(
    @InjectRepository(FormAnswerEntity)
    private readonly repository: Repository<FormAnswerEntity>,
  ) {}

  async create(
    data: Omit<FormAnswer, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormAnswer> {
    const persistenceModel = FormAnswerMapper.toPersistence(data as FormAnswer);
    const newEntity = await this.repository.save(
      this.repository.create(persistenceModel),
    );
    return FormAnswerMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormAnswer[]> {
    const entities = await this.repository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => FormAnswerMapper.toDomain(entity));
  }

  async findById(id: FormAnswer['id']): Promise<NullableType<FormAnswer>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? FormAnswerMapper.toDomain(entity) : null;
  }

  async findByIds(ids: FormAnswer['id'][]): Promise<FormAnswer[]> {
    const entities = await this.repository.find({ where: { id: In(ids) } });
    return entities.map((entity) => FormAnswerMapper.toDomain(entity));
  }

  async update(
    id: FormAnswer['id'],
    payload: DeepPartial<FormAnswer>,
  ): Promise<FormAnswer> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `form_answerNotFound`,
      });
    }

    const updatedEntity = await this.repository.save(
      this.repository.create(
        FormAnswerMapper.toPersistence({
          ...FormAnswerMapper.toDomain(entity),
          ...payload,
        } as FormAnswer),
      ),
    );

    return FormAnswerMapper.toDomain(updatedEntity);
  }

  async remove(id: FormAnswer['id']): Promise<void> {
    await this.repository.delete(id);
  }
}
