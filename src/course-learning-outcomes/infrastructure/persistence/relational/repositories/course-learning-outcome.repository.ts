import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CourseLearningOutcomeEntity } from '../entities/course-learning-outcome.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { CourseLearningOutcome } from '../../../../domain/course-learning-outcome';
import { CourseLearningOutcomeRepository } from '../../course-learning-outcome.repository';
import { CourseLearningOutcomeMapper } from '../mappers/course-learning-outcome.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class CourseLearningOutcomeRelationalRepository implements CourseLearningOutcomeRepository {
  constructor(
    @InjectRepository(CourseLearningOutcomeEntity)
    private readonly courseLearningOutcomeRepository: Repository<CourseLearningOutcomeEntity>,
  ) {}

  async create(data: CourseLearningOutcome): Promise<CourseLearningOutcome> {
    const persistenceModel = CourseLearningOutcomeMapper.toPersistence(data);
    const newEntity = await this.courseLearningOutcomeRepository.save(
      this.courseLearningOutcomeRepository.create(persistenceModel),
    );
    return CourseLearningOutcomeMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CourseLearningOutcome[]> {
    const entities = await this.courseLearningOutcomeRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) =>
      CourseLearningOutcomeMapper.toDomain(entity),
    );
  }

  async findById(
    id: CourseLearningOutcome['id'],
  ): Promise<NullableType<CourseLearningOutcome>> {
    const entity = await this.courseLearningOutcomeRepository.findOne({
      where: { id },
    });

    return entity ? CourseLearningOutcomeMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: CourseLearningOutcome['id'][],
  ): Promise<CourseLearningOutcome[]> {
    const entities = await this.courseLearningOutcomeRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) =>
      CourseLearningOutcomeMapper.toDomain(entity),
    );
  }

  async update(
    id: CourseLearningOutcome['id'],
    payload: Partial<CourseLearningOutcome>,
  ): Promise<CourseLearningOutcome> {
    const entity = await this.courseLearningOutcomeRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.courseLearningOutcomeRepository.save(
      this.courseLearningOutcomeRepository.create(
        CourseLearningOutcomeMapper.toPersistence({
          ...CourseLearningOutcomeMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return CourseLearningOutcomeMapper.toDomain(updatedEntity);
  }

  async remove(id: CourseLearningOutcome['id']): Promise<void> {
    await this.courseLearningOutcomeRepository.delete(id);
  }
}
