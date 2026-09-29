import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { NotFoundException, HttpStatus } from '@nestjs/common';
import { DeepPartial } from '../../../../../utils/types/deep-partial.type';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { FormQuestion } from '../../../../domain/form-question';
import { FormQuestionRepository } from '../../form-question.repository';
import { FormQuestionEntity } from '../entities/form-question.entity';
import { FormQuestionMapper } from '../mappers/form-question.mapper';

@Injectable()
export class FormQuestionRelationalRepository implements FormQuestionRepository {
  constructor(
    @InjectRepository(FormQuestionEntity)
    private readonly repository: Repository<FormQuestionEntity>,
  ) {}

  async create(
    data: Omit<FormQuestion, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormQuestion> {
    const persistenceModel = FormQuestionMapper.toPersistence(
      data as FormQuestion,
    );
    const newEntity = await this.repository.save(
      this.repository.create(persistenceModel),
    );
    return FormQuestionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormQuestion[]> {
    const entities = await this.repository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => FormQuestionMapper.toDomain(entity));
  }

  async findById(id: FormQuestion['id']): Promise<NullableType<FormQuestion>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? FormQuestionMapper.toDomain(entity) : null;
  }

  async findByIds(ids: FormQuestion['id'][]): Promise<FormQuestion[]> {
    const entities = await this.repository.find({ where: { id: In(ids) } });
    return entities.map((entity) => FormQuestionMapper.toDomain(entity));
  }

  async update(
    id: FormQuestion['id'],
    payload: DeepPartial<FormQuestion>,
  ): Promise<FormQuestion> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `form_questionNotFound`,
      });
    }

    const updatedEntity = await this.repository.save(
      this.repository.create(
        FormQuestionMapper.toPersistence({
          ...FormQuestionMapper.toDomain(entity),
          ...payload,
        } as FormQuestion),
      ),
    );

    return FormQuestionMapper.toDomain(updatedEntity);
  }

  async remove(id: FormQuestion['id']): Promise<void> {
    await this.repository.delete(id);
  }
}
