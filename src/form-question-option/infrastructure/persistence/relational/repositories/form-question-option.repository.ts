import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { NotFoundException, HttpStatus } from '@nestjs/common';
import { DeepPartial } from '../../../../../utils/types/deep-partial.type';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { FormQuestionOption } from '../../../../domain/form-question-option';
import { FormQuestionOptionRepository } from '../../form-question-option.repository';
import { FormQuestionOptionEntity } from '../entities/form-question-option.entity';
import { FormQuestionOptionMapper } from '../mappers/form-question-option.mapper';

@Injectable()
export class FormQuestionOptionRelationalRepository implements FormQuestionOptionRepository {
  constructor(
    @InjectRepository(FormQuestionOptionEntity)
    private readonly repository: Repository<FormQuestionOptionEntity>,
  ) {}

  async create(
    data: Omit<FormQuestionOption, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormQuestionOption> {
    const persistenceModel = FormQuestionOptionMapper.toPersistence(
      data as FormQuestionOption,
    );
    const newEntity = await this.repository.save(
      this.repository.create(persistenceModel),
    );
    return FormQuestionOptionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormQuestionOption[]> {
    const entities = await this.repository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => FormQuestionOptionMapper.toDomain(entity));
  }

  async findById(
    id: FormQuestionOption['id'],
  ): Promise<NullableType<FormQuestionOption>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? FormQuestionOptionMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: FormQuestionOption['id'][],
  ): Promise<FormQuestionOption[]> {
    const entities = await this.repository.find({ where: { id: In(ids) } });
    return entities.map((entity) => FormQuestionOptionMapper.toDomain(entity));
  }

  async update(
    id: FormQuestionOption['id'],
    payload: DeepPartial<FormQuestionOption>,
  ): Promise<FormQuestionOption> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `form_question_optionNotFound`,
      });
    }

    const updatedEntity = await this.repository.save(
      this.repository.create(
        FormQuestionOptionMapper.toPersistence({
          ...FormQuestionOptionMapper.toDomain(entity),
          ...payload,
        } as FormQuestionOption),
      ),
    );

    return FormQuestionOptionMapper.toDomain(updatedEntity);
  }

  async remove(id: FormQuestionOption['id']): Promise<void> {
    await this.repository.delete(id);
  }
}
