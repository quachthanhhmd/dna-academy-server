import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { NotFoundException, HttpStatus } from '@nestjs/common';
import { DeepPartial } from '../../../../../utils/types/deep-partial.type';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { FormSubmission } from '../../../../domain/form-submission';
import { FormSubmissionRepository } from '../../form-submission.repository';
import { FormSubmissionEntity } from '../entities/form-submission.entity';
import { FormSubmissionMapper } from '../mappers/form-submission.mapper';

@Injectable()
export class FormSubmissionRelationalRepository implements FormSubmissionRepository {
  constructor(
    @InjectRepository(FormSubmissionEntity)
    private readonly repository: Repository<FormSubmissionEntity>,
  ) {}

  async create(
    data: Omit<FormSubmission, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormSubmission> {
    const persistenceModel = FormSubmissionMapper.toPersistence(
      data as FormSubmission,
    );
    const newEntity = await this.repository.save(
      this.repository.create(persistenceModel),
    );
    return FormSubmissionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormSubmission[]> {
    const entities = await this.repository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => FormSubmissionMapper.toDomain(entity));
  }

  async findById(
    id: FormSubmission['id'],
  ): Promise<NullableType<FormSubmission>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? FormSubmissionMapper.toDomain(entity) : null;
  }

  async findByIds(ids: FormSubmission['id'][]): Promise<FormSubmission[]> {
    const entities = await this.repository.find({ where: { id: In(ids) } });
    return entities.map((entity) => FormSubmissionMapper.toDomain(entity));
  }

  async update(
    id: FormSubmission['id'],
    payload: DeepPartial<FormSubmission>,
  ): Promise<FormSubmission> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `form_submissionNotFound`,
      });
    }

    const updatedEntity = await this.repository.save(
      this.repository.create(
        FormSubmissionMapper.toPersistence({
          ...FormSubmissionMapper.toDomain(entity),
          ...payload,
        } as FormSubmission),
      ),
    );

    return FormSubmissionMapper.toDomain(updatedEntity);
  }

  async remove(id: FormSubmission['id']): Promise<void> {
    await this.repository.delete(id);
  }
}
