import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { StudentProfileEntity } from '../entities/student-profile.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { StudentProfile } from '../../../../domain/student-profile';
import { StudentProfileRepository } from '../../student-profile.repository';
import { StudentProfileMapper } from '../mappers/student-profile.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class StudentProfileRelationalRepository implements StudentProfileRepository {
  constructor(
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
  ) {}

  async create(data: StudentProfile): Promise<StudentProfile> {
    const persistenceModel = StudentProfileMapper.toPersistence(data);
    const newEntity = await this.studentProfileRepository.save(
      this.studentProfileRepository.create(persistenceModel),
    );
    return StudentProfileMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<StudentProfile[]> {
    const entities = await this.studentProfileRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => StudentProfileMapper.toDomain(entity));
  }

  async findById(
    id: StudentProfile['id'],
  ): Promise<NullableType<StudentProfile>> {
    const entity = await this.studentProfileRepository.findOne({
      where: { id },
    });

    return entity ? StudentProfileMapper.toDomain(entity) : null;
  }

  async findByIds(ids: StudentProfile['id'][]): Promise<StudentProfile[]> {
    const entities = await this.studentProfileRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => StudentProfileMapper.toDomain(entity));
  }

  async update(
    id: StudentProfile['id'],
    payload: Partial<StudentProfile>,
  ): Promise<StudentProfile> {
    const entity = await this.studentProfileRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.studentProfileRepository.save(
      this.studentProfileRepository.create(
        StudentProfileMapper.toPersistence({
          ...StudentProfileMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return StudentProfileMapper.toDomain(updatedEntity);
  }

  async remove(id: StudentProfile['id']): Promise<void> {
    await this.studentProfileRepository.delete(id);
  }
}
