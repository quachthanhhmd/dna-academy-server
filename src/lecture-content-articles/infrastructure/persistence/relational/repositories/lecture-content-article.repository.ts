import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LectureContentArticleEntity } from '../entities/lecture-content-article.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { LectureContentArticle } from '../../../../domain/lecture-content-article';
import { LectureContentArticleRepository } from '../../lecture-content-article.repository';
import { LectureContentArticleMapper } from '../mappers/lecture-content-article.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class LectureContentArticleRelationalRepository implements LectureContentArticleRepository {
  constructor(
    @InjectRepository(LectureContentArticleEntity)
    private readonly lectureContentArticleRepository: Repository<LectureContentArticleEntity>,
  ) {}

  async create(data: LectureContentArticle): Promise<LectureContentArticle> {
    const persistenceModel = LectureContentArticleMapper.toPersistence(data);
    const newEntity = await this.lectureContentArticleRepository.save(
      this.lectureContentArticleRepository.create(persistenceModel),
    );
    return LectureContentArticleMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureContentArticle[]> {
    const entities = await this.lectureContentArticleRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) =>
      LectureContentArticleMapper.toDomain(entity),
    );
  }

  async findById(
    id: LectureContentArticle['id'],
  ): Promise<NullableType<LectureContentArticle>> {
    const entity = await this.lectureContentArticleRepository.findOne({
      where: { id },
    });

    return entity ? LectureContentArticleMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: LectureContentArticle['id'][],
  ): Promise<LectureContentArticle[]> {
    const entities = await this.lectureContentArticleRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) =>
      LectureContentArticleMapper.toDomain(entity),
    );
  }

  async findByLectureId(
    lectureId: string,
  ): Promise<NullableType<LectureContentArticle>> {
    const entity = await this.lectureContentArticleRepository.findOne({
      where: { lecture: { id: lectureId } },
    });

    return entity ? LectureContentArticleMapper.toDomain(entity) : null;
  }

  async update(
    id: LectureContentArticle['id'],
    payload: Partial<LectureContentArticle>,
  ): Promise<LectureContentArticle> {
    const entity = await this.lectureContentArticleRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.lectureContentArticleRepository.save(
      this.lectureContentArticleRepository.create(
        LectureContentArticleMapper.toPersistence({
          ...LectureContentArticleMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return LectureContentArticleMapper.toDomain(updatedEntity);
  }

  async remove(id: LectureContentArticle['id']): Promise<void> {
    await this.lectureContentArticleRepository.delete(id);
  }
}
