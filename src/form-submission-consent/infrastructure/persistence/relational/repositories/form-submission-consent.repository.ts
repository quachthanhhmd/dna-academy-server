import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { NotFoundException, HttpStatus } from '@nestjs/common';
import { DeepPartial } from '../../../../../utils/types/deep-partial.type';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { FormSubmissionConsent } from '../../../../domain/form-submission-consent';
import { FormSubmissionConsentRepository } from '../../form-submission-consent.repository';
import { FormSubmissionConsentEntity } from '../entities/form-submission-consent.entity';
import { FormSubmissionConsentMapper } from '../mappers/form-submission-consent.mapper';

@Injectable()
export class FormSubmissionConsentRelationalRepository implements FormSubmissionConsentRepository {
  constructor(
    @InjectRepository(FormSubmissionConsentEntity)
    private readonly repository: Repository<FormSubmissionConsentEntity>,
  ) {}

  async create(
    data: Omit<FormSubmissionConsent, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormSubmissionConsent> {
    const persistenceModel = FormSubmissionConsentMapper.toPersistence(
      data as FormSubmissionConsent,
    );
    const newEntity = await this.repository.save(
      this.repository.create(persistenceModel),
    );
    return FormSubmissionConsentMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<FormSubmissionConsent[]> {
    const entities = await this.repository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) =>
      FormSubmissionConsentMapper.toDomain(entity),
    );
  }

  async findById(
    id: FormSubmissionConsent['id'],
  ): Promise<NullableType<FormSubmissionConsent>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? FormSubmissionConsentMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: FormSubmissionConsent['id'][],
  ): Promise<FormSubmissionConsent[]> {
    const entities = await this.repository.find({ where: { id: In(ids) } });
    return entities.map((entity) =>
      FormSubmissionConsentMapper.toDomain(entity),
    );
  }

  async update(
    id: FormSubmissionConsent['id'],
    payload: DeepPartial<FormSubmissionConsent>,
  ): Promise<FormSubmissionConsent> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `form_submission_consentNotFound`,
      });
    }

    const updatedEntity = await this.repository.save(
      this.repository.create(
        FormSubmissionConsentMapper.toPersistence({
          ...FormSubmissionConsentMapper.toDomain(entity),
          ...payload,
        } as FormSubmissionConsent),
      ),
    );

    return FormSubmissionConsentMapper.toDomain(updatedEntity);
  }

  async remove(id: FormSubmissionConsent['id']): Promise<void> {
    await this.repository.delete(id);
  }
}
