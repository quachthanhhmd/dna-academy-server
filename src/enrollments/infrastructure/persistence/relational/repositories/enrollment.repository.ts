import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EnrollmentEntity } from '../entities/enrollment.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Enrollment } from '../../../../domain/enrollment';
import { EnrollmentRepository } from '../../enrollment.repository';
import { EnrollmentMapper } from '../mappers/enrollment.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class EnrollmentRelationalRepository implements EnrollmentRepository {
  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepository: Repository<EnrollmentEntity>,
  ) {}

  async create(data: Enrollment): Promise<Enrollment> {
    const persistenceModel = EnrollmentMapper.toPersistence(data);
    const newEntity = await this.enrollmentRepository.save(
      this.enrollmentRepository.create(persistenceModel),
    );
    return EnrollmentMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Enrollment[]> {
    const entities = await this.enrollmentRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => EnrollmentMapper.toDomain(entity));
  }

  async findById(id: Enrollment['id']): Promise<NullableType<Enrollment>> {
    const entity = await this.enrollmentRepository.findOne({
      where: { id },
    });

    return entity ? EnrollmentMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Enrollment['id'][]): Promise<Enrollment[]> {
    const entities = await this.enrollmentRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => EnrollmentMapper.toDomain(entity));
  }

  async update(
    id: Enrollment['id'],
    payload: Partial<Enrollment>,
  ): Promise<Enrollment> {
    const entity = await this.enrollmentRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.enrollmentRepository.save(
      this.enrollmentRepository.create(
        EnrollmentMapper.toPersistence({
          ...EnrollmentMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return EnrollmentMapper.toDomain(updatedEntity);
  }

  async remove(id: Enrollment['id']): Promise<void> {
    await this.enrollmentRepository.delete(id);
  }
}
