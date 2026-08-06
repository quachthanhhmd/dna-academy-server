import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LectureProgressEntity } from '../entities/lecture-progress.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { LectureProgress } from '../../../../domain/lecture-progress';
import { LectureProgressRepository } from '../../lecture-progress.repository';
import { LectureProgressMapper } from '../mappers/lecture-progress.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class LectureProgressRelationalRepository implements LectureProgressRepository {
  constructor(
    @InjectRepository(LectureProgressEntity)
    private readonly lectureProgressRepository: Repository<LectureProgressEntity>,
  ) {}

  async create(data: LectureProgress): Promise<LectureProgress> {
    const persistenceModel = LectureProgressMapper.toPersistence(data);
    const newEntity = await this.lectureProgressRepository.save(
      this.lectureProgressRepository.create(persistenceModel),
    );
    return LectureProgressMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureProgress[]> {
    const entities = await this.lectureProgressRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => LectureProgressMapper.toDomain(entity));
  }

  async findById(
    id: LectureProgress['id'],
  ): Promise<NullableType<LectureProgress>> {
    const entity = await this.lectureProgressRepository.findOne({
      where: { id },
    });

    return entity ? LectureProgressMapper.toDomain(entity) : null;
  }

  async findByIds(ids: LectureProgress['id'][]): Promise<LectureProgress[]> {
    const entities = await this.lectureProgressRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => LectureProgressMapper.toDomain(entity));
  }

  async update(
    id: LectureProgress['id'],
    payload: Partial<LectureProgress>,
  ): Promise<LectureProgress> {
    const entity = await this.lectureProgressRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.lectureProgressRepository.save(
      this.lectureProgressRepository.create(
        LectureProgressMapper.toPersistence({
          ...LectureProgressMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return LectureProgressMapper.toDomain(updatedEntity);
  }

  async remove(id: LectureProgress['id']): Promise<void> {
    await this.lectureProgressRepository.delete(id);
  }
}
