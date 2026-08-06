import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CareerReflectionQuestionEntity } from '../entities/career-reflection-question.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { CareerReflectionQuestion } from '../../../../domain/career-reflection-question';
import { CareerReflectionQuestionRepository } from '../../career-reflection-question.repository';
import { CareerReflectionQuestionMapper } from '../mappers/career-reflection-question.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class CareerReflectionQuestionRelationalRepository implements CareerReflectionQuestionRepository {
  constructor(
    @InjectRepository(CareerReflectionQuestionEntity)
    private readonly careerReflectionQuestionRepository: Repository<CareerReflectionQuestionEntity>,
  ) {}

  async create(
    data: CareerReflectionQuestion,
  ): Promise<CareerReflectionQuestion> {
    const persistenceModel = CareerReflectionQuestionMapper.toPersistence(data);
    const newEntity = await this.careerReflectionQuestionRepository.save(
      this.careerReflectionQuestionRepository.create(persistenceModel),
    );
    return CareerReflectionQuestionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CareerReflectionQuestion[]> {
    const entities = await this.careerReflectionQuestionRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) =>
      CareerReflectionQuestionMapper.toDomain(entity),
    );
  }

  async findById(
    id: CareerReflectionQuestion['id'],
  ): Promise<NullableType<CareerReflectionQuestion>> {
    const entity = await this.careerReflectionQuestionRepository.findOne({
      where: { id },
    });

    return entity ? CareerReflectionQuestionMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: CareerReflectionQuestion['id'][],
  ): Promise<CareerReflectionQuestion[]> {
    const entities = await this.careerReflectionQuestionRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) =>
      CareerReflectionQuestionMapper.toDomain(entity),
    );
  }

  async update(
    id: CareerReflectionQuestion['id'],
    payload: Partial<CareerReflectionQuestion>,
  ): Promise<CareerReflectionQuestion> {
    const entity = await this.careerReflectionQuestionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.careerReflectionQuestionRepository.save(
      this.careerReflectionQuestionRepository.create(
        CareerReflectionQuestionMapper.toPersistence({
          ...CareerReflectionQuestionMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return CareerReflectionQuestionMapper.toDomain(updatedEntity);
  }

  async remove(id: CareerReflectionQuestion['id']): Promise<void> {
    await this.careerReflectionQuestionRepository.delete(id);
  }
}
