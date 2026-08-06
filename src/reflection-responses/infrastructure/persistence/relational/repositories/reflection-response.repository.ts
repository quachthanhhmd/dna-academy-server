import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ReflectionResponseEntity } from '../entities/reflection-response.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { ReflectionResponse } from '../../../../domain/reflection-response';
import { ReflectionResponseRepository } from '../../reflection-response.repository';
import { ReflectionResponseMapper } from '../mappers/reflection-response.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class ReflectionResponseRelationalRepository implements ReflectionResponseRepository {
  constructor(
    @InjectRepository(ReflectionResponseEntity)
    private readonly reflectionResponseRepository: Repository<ReflectionResponseEntity>,
  ) {}

  async create(data: ReflectionResponse): Promise<ReflectionResponse> {
    const persistenceModel = ReflectionResponseMapper.toPersistence(data);
    const newEntity = await this.reflectionResponseRepository.save(
      this.reflectionResponseRepository.create(persistenceModel),
    );
    return ReflectionResponseMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<ReflectionResponse[]> {
    const entities = await this.reflectionResponseRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => ReflectionResponseMapper.toDomain(entity));
  }

  async findById(
    id: ReflectionResponse['id'],
  ): Promise<NullableType<ReflectionResponse>> {
    const entity = await this.reflectionResponseRepository.findOne({
      where: { id },
    });

    return entity ? ReflectionResponseMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: ReflectionResponse['id'][],
  ): Promise<ReflectionResponse[]> {
    const entities = await this.reflectionResponseRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => ReflectionResponseMapper.toDomain(entity));
  }

  async update(
    id: ReflectionResponse['id'],
    payload: Partial<ReflectionResponse>,
  ): Promise<ReflectionResponse> {
    const entity = await this.reflectionResponseRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.reflectionResponseRepository.save(
      this.reflectionResponseRepository.create(
        ReflectionResponseMapper.toPersistence({
          ...ReflectionResponseMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return ReflectionResponseMapper.toDomain(updatedEntity);
  }

  async remove(id: ReflectionResponse['id']): Promise<void> {
    await this.reflectionResponseRepository.delete(id);
  }
}
