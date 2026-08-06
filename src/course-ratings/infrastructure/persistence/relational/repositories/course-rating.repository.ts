import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CourseRatingEntity } from '../entities/course-rating.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { CourseRating } from '../../../../domain/course-rating';
import { CourseRatingRepository } from '../../course-rating.repository';
import { CourseRatingMapper } from '../mappers/course-rating.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class CourseRatingRelationalRepository implements CourseRatingRepository {
  constructor(
    @InjectRepository(CourseRatingEntity)
    private readonly courseRatingRepository: Repository<CourseRatingEntity>,
  ) {}

  async create(data: CourseRating): Promise<CourseRating> {
    const persistenceModel = CourseRatingMapper.toPersistence(data);
    const newEntity = await this.courseRatingRepository.save(
      this.courseRatingRepository.create(persistenceModel),
    );
    return CourseRatingMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CourseRating[]> {
    const entities = await this.courseRatingRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => CourseRatingMapper.toDomain(entity));
  }

  async findById(id: CourseRating['id']): Promise<NullableType<CourseRating>> {
    const entity = await this.courseRatingRepository.findOne({
      where: { id },
    });

    return entity ? CourseRatingMapper.toDomain(entity) : null;
  }

  async findByIds(ids: CourseRating['id'][]): Promise<CourseRating[]> {
    const entities = await this.courseRatingRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => CourseRatingMapper.toDomain(entity));
  }

  async update(
    id: CourseRating['id'],
    payload: Partial<CourseRating>,
  ): Promise<CourseRating> {
    const entity = await this.courseRatingRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.courseRatingRepository.save(
      this.courseRatingRepository.create(
        CourseRatingMapper.toPersistence({
          ...CourseRatingMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return CourseRatingMapper.toDomain(updatedEntity);
  }

  async remove(id: CourseRating['id']): Promise<void> {
    await this.courseRatingRepository.delete(id);
  }
}
