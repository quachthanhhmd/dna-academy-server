import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LectureContentQuizEntity } from '../entities/lecture-content-quiz.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { LectureContentQuiz } from '../../../../domain/lecture-content-quiz';
import { LectureContentQuizRepository } from '../../lecture-content-quiz.repository';
import { LectureContentQuizMapper } from '../mappers/lecture-content-quiz.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class LectureContentQuizRelationalRepository implements LectureContentQuizRepository {
  constructor(
    @InjectRepository(LectureContentQuizEntity)
    private readonly lectureContentQuizRepository: Repository<LectureContentQuizEntity>,
  ) {}

  async create(data: LectureContentQuiz): Promise<LectureContentQuiz> {
    const persistenceModel = LectureContentQuizMapper.toPersistence(data);
    const newEntity = await this.lectureContentQuizRepository.save(
      this.lectureContentQuizRepository.create(persistenceModel),
    );
    return LectureContentQuizMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureContentQuiz[]> {
    const entities = await this.lectureContentQuizRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => LectureContentQuizMapper.toDomain(entity));
  }

  async findById(
    id: LectureContentQuiz['id'],
  ): Promise<NullableType<LectureContentQuiz>> {
    const entity = await this.lectureContentQuizRepository.findOne({
      where: { id },
    });

    return entity ? LectureContentQuizMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: LectureContentQuiz['id'][],
  ): Promise<LectureContentQuiz[]> {
    const entities = await this.lectureContentQuizRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => LectureContentQuizMapper.toDomain(entity));
  }

  async findByLectureId(
    lectureId: string,
  ): Promise<NullableType<LectureContentQuiz>> {
    const entity = await this.lectureContentQuizRepository.findOne({
      where: { lecture: { id: lectureId } },
    });

    return entity ? LectureContentQuizMapper.toDomain(entity) : null;
  }

  async update(
    id: LectureContentQuiz['id'],
    payload: Partial<LectureContentQuiz>,
  ): Promise<LectureContentQuiz> {
    const entity = await this.lectureContentQuizRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.lectureContentQuizRepository.save(
      this.lectureContentQuizRepository.create(
        LectureContentQuizMapper.toPersistence({
          ...LectureContentQuizMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return LectureContentQuizMapper.toDomain(updatedEntity);
  }

  async remove(id: LectureContentQuiz['id']): Promise<void> {
    await this.lectureContentQuizRepository.delete(id);
  }
}
