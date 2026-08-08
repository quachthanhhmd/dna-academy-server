import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { QuizAnswerOptionEntity } from '../entities/quiz-answer-option.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { QuizAnswerOption } from '../../../../domain/quiz-answer-option';
import { QuizAnswerOptionRepository } from '../../quiz-answer-option.repository';
import { QuizAnswerOptionMapper } from '../mappers/quiz-answer-option.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class QuizAnswerOptionRelationalRepository implements QuizAnswerOptionRepository {
  constructor(
    @InjectRepository(QuizAnswerOptionEntity)
    private readonly quizAnswerOptionRepository: Repository<QuizAnswerOptionEntity>,
  ) {}

  async create(data: QuizAnswerOption): Promise<QuizAnswerOption> {
    const persistenceModel = QuizAnswerOptionMapper.toPersistence(data);
    const newEntity = await this.quizAnswerOptionRepository.save(
      this.quizAnswerOptionRepository.create(persistenceModel),
    );
    return QuizAnswerOptionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<QuizAnswerOption[]> {
    const entities = await this.quizAnswerOptionRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => QuizAnswerOptionMapper.toDomain(entity));
  }

  async findById(
    id: QuizAnswerOption['id'],
  ): Promise<NullableType<QuizAnswerOption>> {
    const entity = await this.quizAnswerOptionRepository.findOne({
      where: { id },
    });

    return entity ? QuizAnswerOptionMapper.toDomain(entity) : null;
  }

  async findByIds(ids: QuizAnswerOption['id'][]): Promise<QuizAnswerOption[]> {
    const entities = await this.quizAnswerOptionRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => QuizAnswerOptionMapper.toDomain(entity));
  }

  async removeByQuestionIds(questionIds: string[]): Promise<void> {
    if (!questionIds.length) {
      return;
    }
    await this.quizAnswerOptionRepository.delete({
      question: { id: In(questionIds) },
    });
  }

  async update(
    id: QuizAnswerOption['id'],
    payload: Partial<QuizAnswerOption>,
  ): Promise<QuizAnswerOption> {
    const entity = await this.quizAnswerOptionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.quizAnswerOptionRepository.save(
      this.quizAnswerOptionRepository.create(
        QuizAnswerOptionMapper.toPersistence({
          ...QuizAnswerOptionMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return QuizAnswerOptionMapper.toDomain(updatedEntity);
  }

  async remove(id: QuizAnswerOption['id']): Promise<void> {
    await this.quizAnswerOptionRepository.delete(id);
  }
}
