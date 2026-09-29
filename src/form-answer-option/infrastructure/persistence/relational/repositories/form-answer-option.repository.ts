import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { NotFoundException, HttpStatus } from '@nestjs/common';
import { DeepPartial } from '../../../../../utils/types/deep-partial.type';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { FormAnswerOption } from '../../../../domain/form-answer-option';
import { FormAnswerOptionRepository } from '../../form-answer-option.repository';
import { FormAnswerOptionEntity } from '../entities/form-answer-option.entity';
import { FormAnswerOptionMapper } from '../mappers/form-answer-option.mapper';

@Injectable()
export class FormAnswerOptionRelationalRepository implements FormAnswerOptionRepository {
  constructor(
    @InjectRepository(FormAnswerOptionEntity)
    private readonly repository: Repository<FormAnswerOptionEntity>,
  ) {}

  async create(
    data: Omit<FormAnswerOption, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormAnswerOption> {
    const persistenceModel = FormAnswerOptionMapper.toPersistence(
      data as FormAnswerOption,
    );
    const newEntity = await this.repository.save(
      this.repository.create(persistenceModel),
    );
    return FormAnswerOptionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormAnswerOption[]> {
    const entities = await this.repository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => FormAnswerOptionMapper.toDomain(entity));
  }

  async findById(
    id: FormAnswerOption['id'],
  ): Promise<NullableType<FormAnswerOption>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? FormAnswerOptionMapper.toDomain(entity) : null;
  }

  async findByIds(ids: FormAnswerOption['id'][]): Promise<FormAnswerOption[]> {
    const entities = await this.repository.find({ where: { id: In(ids) } });
    return entities.map((entity) => FormAnswerOptionMapper.toDomain(entity));
  }

  async update(
    id: FormAnswerOption['id'],
    payload: DeepPartial<FormAnswerOption>,
  ): Promise<FormAnswerOption> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `form_answer_optionNotFound`,
      });
    }

    const updatedEntity = await this.repository.save(
      this.repository.create(
        FormAnswerOptionMapper.toPersistence({
          ...FormAnswerOptionMapper.toDomain(entity),
          ...payload,
        } as FormAnswerOption),
      ),
    );

    return FormAnswerOptionMapper.toDomain(updatedEntity);
  }

  async remove(id: FormAnswerOption['id']): Promise<void> {
    await this.repository.delete(id);
  }
}
