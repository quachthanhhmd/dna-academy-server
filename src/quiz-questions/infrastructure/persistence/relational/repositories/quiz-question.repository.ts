import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { QuizQuestionEntity } from '../entities/quiz-question.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { QuizQuestion } from '../../../../domain/quiz-question';
import { QuizQuestionRepository } from '../../quiz-question.repository';
import { QuizQuestionMapper } from '../mappers/quiz-question.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class QuizQuestionRelationalRepository implements QuizQuestionRepository {
  constructor(
    @InjectRepository(QuizQuestionEntity)
    private readonly quizQuestionRepository: Repository<QuizQuestionEntity>,
  ) {}

  async create(data: QuizQuestion): Promise<QuizQuestion> {
    const persistenceModel = QuizQuestionMapper.toPersistence(data);
    const newEntity = await this.quizQuestionRepository.save(
      this.quizQuestionRepository.create(persistenceModel),
    );
    return QuizQuestionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<QuizQuestion[]> {
    const entities = await this.quizQuestionRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => QuizQuestionMapper.toDomain(entity));
  }

  async findById(id: QuizQuestion['id']): Promise<NullableType<QuizQuestion>> {
    const entity = await this.quizQuestionRepository.findOne({
      where: { id },
    });

    return entity ? QuizQuestionMapper.toDomain(entity) : null;
  }

  async findByIds(ids: QuizQuestion['id'][]): Promise<QuizQuestion[]> {
    const entities = await this.quizQuestionRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => QuizQuestionMapper.toDomain(entity));
  }

  async findByLectureId(lectureId: string): Promise<QuizQuestion[]> {
    const entities = await this.quizQuestionRepository.find({
      where: { lecture: { id: lectureId } },
      order: { displayOrder: 'ASC' },
    });

    return entities.map((entity) => QuizQuestionMapper.toDomain(entity));
  }

  async removeByLectureId(lectureId: string): Promise<void> {
    await this.quizQuestionRepository.delete({ lecture: { id: lectureId } });
  }

  async update(
    id: QuizQuestion['id'],
    payload: Partial<QuizQuestion>,
  ): Promise<QuizQuestion> {
    const entity = await this.quizQuestionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.quizQuestionRepository.save(
      this.quizQuestionRepository.create(
        QuizQuestionMapper.toPersistence({
          ...QuizQuestionMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return QuizQuestionMapper.toDomain(updatedEntity);
  }

  async remove(id: QuizQuestion['id']): Promise<void> {
    await this.quizQuestionRepository.delete(id);
  }
}
