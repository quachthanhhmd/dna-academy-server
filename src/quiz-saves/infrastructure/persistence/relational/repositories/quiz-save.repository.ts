import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { QuizSaveEntity } from '../entities/quiz-save.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { QuizSave } from '../../../../domain/quiz-save';
import { QuizSaveRepository } from '../../quiz-save.repository';
import { QuizSaveMapper } from '../mappers/quiz-save.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class QuizSaveRelationalRepository implements QuizSaveRepository {
  constructor(
    @InjectRepository(QuizSaveEntity)
    private readonly quizSaveRepository: Repository<QuizSaveEntity>,
  ) {}

  async create(data: QuizSave): Promise<QuizSave> {
    const persistenceModel = QuizSaveMapper.toPersistence(data);
    const newEntity = await this.quizSaveRepository.save(
      this.quizSaveRepository.create(persistenceModel),
    );
    return QuizSaveMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<QuizSave[]> {
    const entities = await this.quizSaveRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => QuizSaveMapper.toDomain(entity));
  }

  async findById(id: QuizSave['id']): Promise<NullableType<QuizSave>> {
    const entity = await this.quizSaveRepository.findOne({
      where: { id },
    });

    return entity ? QuizSaveMapper.toDomain(entity) : null;
  }

  async findByIds(ids: QuizSave['id'][]): Promise<QuizSave[]> {
    const entities = await this.quizSaveRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => QuizSaveMapper.toDomain(entity));
  }

  async update(
    id: QuizSave['id'],
    payload: Partial<QuizSave>,
  ): Promise<QuizSave> {
    const entity = await this.quizSaveRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.quizSaveRepository.save(
      this.quizSaveRepository.create(
        QuizSaveMapper.toPersistence({
          ...QuizSaveMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return QuizSaveMapper.toDomain(updatedEntity);
  }

  async remove(id: QuizSave['id']): Promise<void> {
    await this.quizSaveRepository.delete(id);
  }
}
