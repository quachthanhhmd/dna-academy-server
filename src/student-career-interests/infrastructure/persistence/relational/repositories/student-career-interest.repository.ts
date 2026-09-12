import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { StudentCareerInterestEntity } from '../entities/student-career-interest.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { StudentCareerInterest } from '../../../../domain/student-career-interest';
import { StudentCareerInterestRepository } from '../../student-career-interest.repository';
import { StudentCareerInterestMapper } from '../mappers/student-career-interest.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class StudentCareerInterestRelationalRepository implements StudentCareerInterestRepository {
  constructor(
    @InjectRepository(StudentCareerInterestEntity)
    private readonly studentCareerInterestRepository: Repository<StudentCareerInterestEntity>,
  ) {}

  async create(data: StudentCareerInterest): Promise<StudentCareerInterest> {
    const persistenceModel = StudentCareerInterestMapper.toPersistence(data);
    const newEntity = await this.studentCareerInterestRepository.save(
      this.studentCareerInterestRepository.create(persistenceModel),
    );
    return StudentCareerInterestMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<StudentCareerInterest[]> {
    const entities = await this.studentCareerInterestRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) =>
      StudentCareerInterestMapper.toDomain(entity),
    );
  }

  async findById(
    id: StudentCareerInterest['id'],
  ): Promise<NullableType<StudentCareerInterest>> {
    const entity = await this.studentCareerInterestRepository.findOne({
      where: { id },
    });

    return entity ? StudentCareerInterestMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: StudentCareerInterest['id'][],
  ): Promise<StudentCareerInterest[]> {
    const entities = await this.studentCareerInterestRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) =>
      StudentCareerInterestMapper.toDomain(entity),
    );
  }

  async findByUserId(
    userId: StudentCareerInterest['user']['id'],
  ): Promise<StudentCareerInterest[]> {
    const entities = await this.studentCareerInterestRepository.find({
      where: { user: { id: userId } },
      relations: ['careerInterest'],
    });

    return entities.map((entity) =>
      StudentCareerInterestMapper.toDomain(entity),
    );
  }

  async update(
    id: StudentCareerInterest['id'],
    payload: Partial<StudentCareerInterest>,
  ): Promise<StudentCareerInterest> {
    const entity = await this.studentCareerInterestRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.studentCareerInterestRepository.save(
      this.studentCareerInterestRepository.create(
        StudentCareerInterestMapper.toPersistence({
          ...StudentCareerInterestMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return StudentCareerInterestMapper.toDomain(updatedEntity);
  }

  async remove(id: StudentCareerInterest['id']): Promise<void> {
    await this.studentCareerInterestRepository.delete(id);
  }
}
