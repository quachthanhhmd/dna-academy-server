import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CourseTargetLearnerEntity } from '../entities/course-target-learner.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { CourseTargetLearner } from '../../../../domain/course-target-learner';
import { CourseTargetLearnerRepository } from '../../course-target-learner.repository';
import { CourseTargetLearnerMapper } from '../mappers/course-target-learner.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class CourseTargetLearnerRelationalRepository implements CourseTargetLearnerRepository {
  constructor(
    @InjectRepository(CourseTargetLearnerEntity)
    private readonly courseTargetLearnerRepository: Repository<CourseTargetLearnerEntity>,
  ) {}

  async create(data: CourseTargetLearner): Promise<CourseTargetLearner> {
    const persistenceModel = CourseTargetLearnerMapper.toPersistence(data);
    const newEntity = await this.courseTargetLearnerRepository.save(
      this.courseTargetLearnerRepository.create(persistenceModel),
    );
    return CourseTargetLearnerMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CourseTargetLearner[]> {
    const entities = await this.courseTargetLearnerRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => CourseTargetLearnerMapper.toDomain(entity));
  }

  async findById(
    id: CourseTargetLearner['id'],
  ): Promise<NullableType<CourseTargetLearner>> {
    const entity = await this.courseTargetLearnerRepository.findOne({
      where: { id },
    });

    return entity ? CourseTargetLearnerMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: CourseTargetLearner['id'][],
  ): Promise<CourseTargetLearner[]> {
    const entities = await this.courseTargetLearnerRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => CourseTargetLearnerMapper.toDomain(entity));
  }

  async update(
    id: CourseTargetLearner['id'],
    payload: Partial<CourseTargetLearner>,
  ): Promise<CourseTargetLearner> {
    const entity = await this.courseTargetLearnerRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.courseTargetLearnerRepository.save(
      this.courseTargetLearnerRepository.create(
        CourseTargetLearnerMapper.toPersistence({
          ...CourseTargetLearnerMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return CourseTargetLearnerMapper.toDomain(updatedEntity);
  }

  async remove(id: CourseTargetLearner['id']): Promise<void> {
    await this.courseTargetLearnerRepository.delete(id);
  }
}
