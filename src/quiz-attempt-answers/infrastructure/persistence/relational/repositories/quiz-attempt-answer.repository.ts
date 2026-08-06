import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { QuizAttemptAnswerEntity } from '../entities/quiz-attempt-answer.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { QuizAttemptAnswer } from '../../../../domain/quiz-attempt-answer';
import { QuizAttemptAnswerRepository } from '../../quiz-attempt-answer.repository';
import { QuizAttemptAnswerMapper } from '../mappers/quiz-attempt-answer.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class QuizAttemptAnswerRelationalRepository implements QuizAttemptAnswerRepository {
  constructor(
    @InjectRepository(QuizAttemptAnswerEntity)
    private readonly quizAttemptAnswerRepository: Repository<QuizAttemptAnswerEntity>,
  ) {}

  async create(data: QuizAttemptAnswer): Promise<QuizAttemptAnswer> {
    const persistenceModel = QuizAttemptAnswerMapper.toPersistence(data);
    const newEntity = await this.quizAttemptAnswerRepository.save(
      this.quizAttemptAnswerRepository.create(persistenceModel),
    );
    return QuizAttemptAnswerMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<QuizAttemptAnswer[]> {
    const entities = await this.quizAttemptAnswerRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => QuizAttemptAnswerMapper.toDomain(entity));
  }

  async findById(
    id: QuizAttemptAnswer['id'],
  ): Promise<NullableType<QuizAttemptAnswer>> {
    const entity = await this.quizAttemptAnswerRepository.findOne({
      where: { id },
    });

    return entity ? QuizAttemptAnswerMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: QuizAttemptAnswer['id'][],
  ): Promise<QuizAttemptAnswer[]> {
    const entities = await this.quizAttemptAnswerRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => QuizAttemptAnswerMapper.toDomain(entity));
  }

  async update(
    id: QuizAttemptAnswer['id'],
    payload: Partial<QuizAttemptAnswer>,
  ): Promise<QuizAttemptAnswer> {
    const entity = await this.quizAttemptAnswerRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.quizAttemptAnswerRepository.save(
      this.quizAttemptAnswerRepository.create(
        QuizAttemptAnswerMapper.toPersistence({
          ...QuizAttemptAnswerMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return QuizAttemptAnswerMapper.toDomain(updatedEntity);
  }

  async remove(id: QuizAttemptAnswer['id']): Promise<void> {
    await this.quizAttemptAnswerRepository.delete(id);
  }
}
