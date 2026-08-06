import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CareerReflectionAnswerEntity } from '../entities/career-reflection-answer.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { CareerReflectionAnswer } from '../../../../domain/career-reflection-answer';
import { CareerReflectionAnswerRepository } from '../../career-reflection-answer.repository';
import { CareerReflectionAnswerMapper } from '../mappers/career-reflection-answer.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class CareerReflectionAnswerRelationalRepository implements CareerReflectionAnswerRepository {
  constructor(
    @InjectRepository(CareerReflectionAnswerEntity)
    private readonly careerReflectionAnswerRepository: Repository<CareerReflectionAnswerEntity>,
  ) {}

  async create(data: CareerReflectionAnswer): Promise<CareerReflectionAnswer> {
    const persistenceModel = CareerReflectionAnswerMapper.toPersistence(data);
    const newEntity = await this.careerReflectionAnswerRepository.save(
      this.careerReflectionAnswerRepository.create(persistenceModel),
    );
    return CareerReflectionAnswerMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CareerReflectionAnswer[]> {
    const entities = await this.careerReflectionAnswerRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) =>
      CareerReflectionAnswerMapper.toDomain(entity),
    );
  }

  async findById(
    id: CareerReflectionAnswer['id'],
  ): Promise<NullableType<CareerReflectionAnswer>> {
    const entity = await this.careerReflectionAnswerRepository.findOne({
      where: { id },
    });

    return entity ? CareerReflectionAnswerMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: CareerReflectionAnswer['id'][],
  ): Promise<CareerReflectionAnswer[]> {
    const entities = await this.careerReflectionAnswerRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) =>
      CareerReflectionAnswerMapper.toDomain(entity),
    );
  }

  async update(
    id: CareerReflectionAnswer['id'],
    payload: Partial<CareerReflectionAnswer>,
  ): Promise<CareerReflectionAnswer> {
    const entity = await this.careerReflectionAnswerRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.careerReflectionAnswerRepository.save(
      this.careerReflectionAnswerRepository.create(
        CareerReflectionAnswerMapper.toPersistence({
          ...CareerReflectionAnswerMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return CareerReflectionAnswerMapper.toDomain(updatedEntity);
  }

  async remove(id: CareerReflectionAnswer['id']): Promise<void> {
    await this.careerReflectionAnswerRepository.delete(id);
  }
}
