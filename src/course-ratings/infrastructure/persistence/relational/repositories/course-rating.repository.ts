import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
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

  async findByEnrollmentId(
    enrollmentId: string,
  ): Promise<NullableType<CourseRating>> {
    const entity = await this.courseRatingRepository.findOne({
      where: { enrollment: { id: enrollmentId } },
    });

    return entity ? CourseRatingMapper.toDomain(entity) : null;
  }

  async findApprovedByCourseId(
    courseId: string,
    paginationOptions: IPaginationOptions,
  ): Promise<{ data: CourseRating[]; total: number }> {
    const [entities, total] = await this.courseRatingRepository.findAndCount({
      where: { course: { id: courseId }, reviewStatus: 'approved' },
      order: { submittedAt: 'DESC' },
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return {
      data: entities.map((entity) => CourseRatingMapper.toDomain(entity)),
      total,
    };
  }

  /** Every rating counts toward the average, approved or not. */
  async averageForCourse(
    courseId: string,
  ): Promise<{ average: number | null; count: number }> {
    const raw = await this.courseRatingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.rating)', 'average')
      .addSelect('COUNT(rating.id)', 'count')
      .where('rating.course = :courseId', { courseId })
      .getRawOne<{ average: string | null; count: string }>();

    return {
      average: raw?.average == null ? null : Number(raw.average),
      count: Number(raw?.count ?? 0),
    };
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
          ...omitUndefined(payload),
        }),
      ),
    );

    return CourseRatingMapper.toDomain(updatedEntity);
  }

  async remove(id: CourseRating['id']): Promise<void> {
    await this.courseRatingRepository.delete(id);
  }
}
