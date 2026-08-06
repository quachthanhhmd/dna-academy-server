import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ReflectionQuestionEntity } from '../entities/reflection-question.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { ReflectionQuestion } from '../../../../domain/reflection-question';
import { ReflectionQuestionRepository } from '../../reflection-question.repository';
import { ReflectionQuestionMapper } from '../mappers/reflection-question.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class ReflectionQuestionRelationalRepository implements ReflectionQuestionRepository {
  constructor(
    @InjectRepository(ReflectionQuestionEntity)
    private readonly reflectionQuestionRepository: Repository<ReflectionQuestionEntity>,
  ) {}

  async create(data: ReflectionQuestion): Promise<ReflectionQuestion> {
    const persistenceModel = ReflectionQuestionMapper.toPersistence(data);
    const newEntity = await this.reflectionQuestionRepository.save(
      this.reflectionQuestionRepository.create(persistenceModel),
    );
    return ReflectionQuestionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<ReflectionQuestion[]> {
    const entities = await this.reflectionQuestionRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => ReflectionQuestionMapper.toDomain(entity));
  }

  async findById(
    id: ReflectionQuestion['id'],
  ): Promise<NullableType<ReflectionQuestion>> {
    const entity = await this.reflectionQuestionRepository.findOne({
      where: { id },
    });

    return entity ? ReflectionQuestionMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: ReflectionQuestion['id'][],
  ): Promise<ReflectionQuestion[]> {
    const entities = await this.reflectionQuestionRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => ReflectionQuestionMapper.toDomain(entity));
  }

  async update(
    id: ReflectionQuestion['id'],
    payload: Partial<ReflectionQuestion>,
  ): Promise<ReflectionQuestion> {
    const entity = await this.reflectionQuestionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.reflectionQuestionRepository.save(
      this.reflectionQuestionRepository.create(
        ReflectionQuestionMapper.toPersistence({
          ...ReflectionQuestionMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return ReflectionQuestionMapper.toDomain(updatedEntity);
  }

  async remove(id: ReflectionQuestion['id']): Promise<void> {
    await this.reflectionQuestionRepository.delete(id);
  }
}
