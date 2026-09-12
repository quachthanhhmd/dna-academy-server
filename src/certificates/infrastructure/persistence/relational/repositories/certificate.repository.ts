import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CertificateEntity } from '../entities/certificate.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Certificate } from '../../../../domain/certificate';
import { CertificateRepository } from '../../certificate.repository';
import { CertificateMapper } from '../mappers/certificate.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class CertificateRelationalRepository implements CertificateRepository {
  constructor(
    @InjectRepository(CertificateEntity)
    private readonly certificateRepository: Repository<CertificateEntity>,
  ) {}

  async create(data: Certificate): Promise<Certificate> {
    const persistenceModel = CertificateMapper.toPersistence(data);
    const newEntity = await this.certificateRepository.save(
      this.certificateRepository.create(persistenceModel),
    );
    return CertificateMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Certificate[]> {
    const entities = await this.certificateRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => CertificateMapper.toDomain(entity));
  }

  async findById(id: Certificate['id']): Promise<NullableType<Certificate>> {
    const entity = await this.certificateRepository.findOne({
      where: { id },
    });

    return entity ? CertificateMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Certificate['id'][]): Promise<Certificate[]> {
    const entities = await this.certificateRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => CertificateMapper.toDomain(entity));
  }

  async findByNumber(
    certificateNumber: string,
  ): Promise<NullableType<Certificate>> {
    const entity = await this.certificateRepository.findOne({
      where: { certificateNumber },
    });

    return entity ? CertificateMapper.toDomain(entity) : null;
  }

  async findByEnrollmentId(
    enrollmentId: string,
  ): Promise<NullableType<Certificate>> {
    const entity = await this.certificateRepository.findOne({
      where: { enrollment: { id: enrollmentId } },
    });

    return entity ? CertificateMapper.toDomain(entity) : null;
  }

  async findByEnrollmentIds(enrollmentIds: string[]): Promise<Certificate[]> {
    if (!enrollmentIds.length) {
      return [];
    }

    const entities = await this.certificateRepository.find({
      where: { enrollment: { id: In(enrollmentIds) } },
    });

    return entities.map((entity) => CertificateMapper.toDomain(entity));
  }

  /** Certificate numbers restart their sequence each calendar year. */
  async nextSequenceValue(): Promise<number> {
    const [{ nextval }]: { nextval: string }[] =
      await this.certificateRepository.query(
        `SELECT nextval('certificate_number_seq')`,
      );

    // Postgres returns bigint as a string to avoid precision loss.
    return Number(nextval);
  }

  async update(
    id: Certificate['id'],
    payload: Partial<Certificate>,
  ): Promise<Certificate> {
    const entity = await this.certificateRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.certificateRepository.save(
      this.certificateRepository.create(
        CertificateMapper.toPersistence({
          ...CertificateMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return CertificateMapper.toDomain(updatedEntity);
  }

  async remove(id: Certificate['id']): Promise<void> {
    await this.certificateRepository.delete(id);
  }
}
