import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LectureContentVideoEntity } from '../entities/lecture-content-video.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { LectureContentVideo } from '../../../../domain/lecture-content-video';
import { LectureContentVideoRepository } from '../../lecture-content-video.repository';
import { LectureContentVideoMapper } from '../mappers/lecture-content-video.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class LectureContentVideoRelationalRepository implements LectureContentVideoRepository {
  constructor(
    @InjectRepository(LectureContentVideoEntity)
    private readonly lectureContentVideoRepository: Repository<LectureContentVideoEntity>,
  ) {}

  async create(data: LectureContentVideo): Promise<LectureContentVideo> {
    const persistenceModel = LectureContentVideoMapper.toPersistence(data);
    const newEntity = await this.lectureContentVideoRepository.save(
      this.lectureContentVideoRepository.create(persistenceModel),
    );
    return LectureContentVideoMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureContentVideo[]> {
    const entities = await this.lectureContentVideoRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => LectureContentVideoMapper.toDomain(entity));
  }

  async findById(
    id: LectureContentVideo['id'],
  ): Promise<NullableType<LectureContentVideo>> {
    const entity = await this.lectureContentVideoRepository.findOne({
      where: { id },
    });

    return entity ? LectureContentVideoMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: LectureContentVideo['id'][],
  ): Promise<LectureContentVideo[]> {
    const entities = await this.lectureContentVideoRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => LectureContentVideoMapper.toDomain(entity));
  }

  async findByLectureId(
    lectureId: string,
  ): Promise<NullableType<LectureContentVideo>> {
    const entity = await this.lectureContentVideoRepository.findOne({
      where: { lecture: { id: lectureId } },
    });

    return entity ? LectureContentVideoMapper.toDomain(entity) : null;
  }

  async update(
    id: LectureContentVideo['id'],
    payload: Partial<LectureContentVideo>,
  ): Promise<LectureContentVideo> {
    const entity = await this.lectureContentVideoRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.lectureContentVideoRepository.save(
      this.lectureContentVideoRepository.create(
        LectureContentVideoMapper.toPersistence({
          ...LectureContentVideoMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return LectureContentVideoMapper.toDomain(updatedEntity);
  }

  async remove(id: LectureContentVideo['id']): Promise<void> {
    await this.lectureContentVideoRepository.delete(id);
  }
}
