import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LectureContentRatingEntity } from '../entities/lecture-content-rating.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { LectureContentRating } from '../../../../domain/lecture-content-rating';
import { LectureContentRatingRepository } from '../../lecture-content-rating.repository';
import { LectureContentRatingMapper } from '../mappers/lecture-content-rating.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class LectureContentRatingRelationalRepository implements LectureContentRatingRepository {
  constructor(
    @InjectRepository(LectureContentRatingEntity)
    private readonly lectureContentRatingRepository: Repository<LectureContentRatingEntity>,
  ) {}

  async create(data: LectureContentRating): Promise<LectureContentRating> {
    const persistenceModel = LectureContentRatingMapper.toPersistence(data);
    const newEntity = await this.lectureContentRatingRepository.save(
      this.lectureContentRatingRepository.create(persistenceModel),
    );
    return LectureContentRatingMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureContentRating[]> {
    const entities = await this.lectureContentRatingRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) =>
      LectureContentRatingMapper.toDomain(entity),
    );
  }

  async findById(
    id: LectureContentRating['id'],
  ): Promise<NullableType<LectureContentRating>> {
    const entity = await this.lectureContentRatingRepository.findOne({
      where: { id },
    });

    return entity ? LectureContentRatingMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: LectureContentRating['id'][],
  ): Promise<LectureContentRating[]> {
    const entities = await this.lectureContentRatingRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) =>
      LectureContentRatingMapper.toDomain(entity),
    );
  }

  async update(
    id: LectureContentRating['id'],
    payload: Partial<LectureContentRating>,
  ): Promise<LectureContentRating> {
    const entity = await this.lectureContentRatingRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.lectureContentRatingRepository.save(
      this.lectureContentRatingRepository.create(
        LectureContentRatingMapper.toPersistence({
          ...LectureContentRatingMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return LectureContentRatingMapper.toDomain(updatedEntity);
  }

  async remove(id: LectureContentRating['id']): Promise<void> {
    await this.lectureContentRatingRepository.delete(id);
  }

  async findByLectureId(
    lectureId: string,
  ): Promise<NullableType<LectureContentRating>> {
    const entity = await this.lectureContentRatingRepository.findOne({
      where: { lecture: { id: lectureId } },
    });

    return entity ? LectureContentRatingMapper.toDomain(entity) : null;
  }
}
