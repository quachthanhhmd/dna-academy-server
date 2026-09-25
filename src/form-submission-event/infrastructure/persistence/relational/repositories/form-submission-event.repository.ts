import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { NotFoundException, HttpStatus } from '@nestjs/common';
import { DeepPartial } from '../../../../../utils/types/deep-partial.type';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { FormSubmissionEvent } from '../../../../domain/form-submission-event';
import { FormSubmissionEventRepository } from '../../form-submission-event.repository';
import { FormSubmissionEventEntity } from '../entities/form-submission-event.entity';
import { FormSubmissionEventMapper } from '../mappers/form-submission-event.mapper';

@Injectable()
export class FormSubmissionEventRelationalRepository implements FormSubmissionEventRepository {
  constructor(
    @InjectRepository(FormSubmissionEventEntity)
    private readonly repository: Repository<FormSubmissionEventEntity>,
  ) {}

  async create(
    data: Omit<FormSubmissionEvent, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormSubmissionEvent> {
    const persistenceModel = FormSubmissionEventMapper.toPersistence(
      data as FormSubmissionEvent,
    );
    const newEntity = await this.repository.save(
      this.repository.create(persistenceModel),
    );
    return FormSubmissionEventMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormSubmissionEvent[]> {
    const entities = await this.repository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => FormSubmissionEventMapper.toDomain(entity));
  }

  async findById(
    id: FormSubmissionEvent['id'],
  ): Promise<NullableType<FormSubmissionEvent>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? FormSubmissionEventMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: FormSubmissionEvent['id'][],
  ): Promise<FormSubmissionEvent[]> {
    const entities = await this.repository.find({ where: { id: In(ids) } });
    return entities.map((entity) => FormSubmissionEventMapper.toDomain(entity));
  }

  async update(
    id: FormSubmissionEvent['id'],
    payload: DeepPartial<FormSubmissionEvent>,
  ): Promise<FormSubmissionEvent> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `form_submission_eventNotFound`,
      });
    }

    const updatedEntity = await this.repository.save(
      this.repository.create(
        FormSubmissionEventMapper.toPersistence({
          ...FormSubmissionEventMapper.toDomain(entity),
          ...payload,
        } as FormSubmissionEvent),
      ),
    );

    return FormSubmissionEventMapper.toDomain(updatedEntity);
  }

  async remove(id: FormSubmissionEvent['id']): Promise<void> {
    await this.repository.delete(id);
  }
}
