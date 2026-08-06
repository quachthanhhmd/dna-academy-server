import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LectureContentReflectionEntity } from '../entities/lecture-content-reflection.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { LectureContentReflection } from '../../../../domain/lecture-content-reflection';
import { LectureContentReflectionRepository } from '../../lecture-content-reflection.repository';
import { LectureContentReflectionMapper } from '../mappers/lecture-content-reflection.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class LectureContentReflectionRelationalRepository implements LectureContentReflectionRepository {
  constructor(
    @InjectRepository(LectureContentReflectionEntity)
    private readonly lectureContentReflectionRepository: Repository<LectureContentReflectionEntity>,
  ) {}

  async create(
    data: LectureContentReflection,
  ): Promise<LectureContentReflection> {
    const persistenceModel = LectureContentReflectionMapper.toPersistence(data);
    const newEntity = await this.lectureContentReflectionRepository.save(
      this.lectureContentReflectionRepository.create(persistenceModel),
    );
    return LectureContentReflectionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureContentReflection[]> {
    const entities = await this.lectureContentReflectionRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) =>
      LectureContentReflectionMapper.toDomain(entity),
    );
  }

  async findById(
    id: LectureContentReflection['id'],
  ): Promise<NullableType<LectureContentReflection>> {
    const entity = await this.lectureContentReflectionRepository.findOne({
      where: { id },
    });

    return entity ? LectureContentReflectionMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: LectureContentReflection['id'][],
  ): Promise<LectureContentReflection[]> {
    const entities = await this.lectureContentReflectionRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) =>
      LectureContentReflectionMapper.toDomain(entity),
    );
  }

  async update(
    id: LectureContentReflection['id'],
    payload: Partial<LectureContentReflection>,
  ): Promise<LectureContentReflection> {
    const entity = await this.lectureContentReflectionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.lectureContentReflectionRepository.save(
      this.lectureContentReflectionRepository.create(
        LectureContentReflectionMapper.toPersistence({
          ...LectureContentReflectionMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return LectureContentReflectionMapper.toDomain(updatedEntity);
  }

  async remove(id: LectureContentReflection['id']): Promise<void> {
    await this.lectureContentReflectionRepository.delete(id);
  }
}
