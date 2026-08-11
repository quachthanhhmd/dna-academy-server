import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, FindOptionsWhere, Repository, In } from 'typeorm';
import { CourseEntity } from '../entities/course.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Course } from '../../../../domain/course';
import {
  CourseCatalogFilterOptions,
  CourseRepository,
} from '../../course.repository';
import { CourseMapper } from '../mappers/course.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class CourseRelationalRepository implements CourseRepository {
  constructor(
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
  ) {}

  async create(data: Course): Promise<Course> {
    const persistenceModel = CourseMapper.toPersistence(data);
    const newEntity = await this.courseRepository.save(
      this.courseRepository.create(persistenceModel),
    );
    return CourseMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: {
      status?: string;
      levelId?: string;
      categoryId?: string;
      instructorId?: number;
    } | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Course[]> {
    const where: FindOptionsWhere<CourseEntity> = {};

    if (filterOptions?.status) {
      where.status = filterOptions.status;
    }
    if (filterOptions?.levelId) {
      where.level = { id: filterOptions.levelId };
    }
    if (filterOptions?.categoryId) {
      where.category = { id: filterOptions.categoryId };
    }
    if (filterOptions?.instructorId) {
      where.instructor = { id: filterOptions.instructorId };
    }

    const entities = await this.courseRepository.find({
      where,
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      order: { createdAt: 'DESC' },
    });

    return entities.map((entity) => CourseMapper.toDomain(entity));
  }

  async findCatalog({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: CourseCatalogFilterOptions | null;
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: Course[]; total: number }> {
    const query = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.level', 'level')
      .leftJoinAndSelect('course.category', 'category')
      .where('course.status = :status', { status: 'published' })
      .andWhere('course.enrollmentOpen = true');

    if (filterOptions?.search) {
      const term = `%${filterOptions.search}%`;
      query.andWhere(
        new Brackets((qb) => {
          qb.where('course.title ILIKE :term', { term })
            .orWhere('course.shortDescription ILIKE :term', { term })
            .orWhere('course.fullDescription ILIKE :term', { term })
            .orWhere('instructor.fullName ILIKE :term', { term });
        }),
      );
    }

    if (filterOptions?.groupId) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM "course_group_assignment" "cga"
          WHERE "cga"."courseId" = course.id AND "cga"."groupId" = :groupId
        )`,
        { groupId: filterOptions.groupId },
      );
    }

    if (filterOptions?.categoryId) {
      query.andWhere('category.id = :categoryId', {
        categoryId: filterOptions.categoryId,
      });
    }

    if (filterOptions?.levelId) {
      query.andWhere('level.id = :levelId', { levelId: filterOptions.levelId });
    }

    if (filterOptions?.instructorId) {
      query.andWhere('instructor.id = :instructorId', {
        instructorId: filterOptions.instructorId,
      });
    }

    if (filterOptions?.isFree !== undefined) {
      query.andWhere('course.isFree = :isFree', {
        isFree: filterOptions.isFree,
      });
    }

    if (filterOptions?.minPrice !== undefined) {
      query.andWhere('course.price >= :minPrice', {
        minPrice: filterOptions.minPrice,
      });
    }

    if (filterOptions?.maxPrice !== undefined) {
      query.andWhere('course.price <= :maxPrice', {
        maxPrice: filterOptions.maxPrice,
      });
    }

    if (filterOptions?.language) {
      query.andWhere('course.language = :language', {
        language: filterOptions.language,
      });
    }

    if (filterOptions?.minRating !== undefined) {
      query.andWhere('course.avgRating >= :minRating', {
        minRating: filterOptions.minRating,
      });
    }

    const [entities, total] = await query
      .orderBy('course.createdAt', 'DESC')
      .skip((paginationOptions.page - 1) * paginationOptions.limit)
      .take(paginationOptions.limit)
      .getManyAndCount();

    return {
      data: entities.map((entity) => CourseMapper.toDomain(entity)),
      total,
    };
  }

  async findById(id: Course['id']): Promise<NullableType<Course>> {
    const entity = await this.courseRepository.findOne({
      where: { id },
    });

    return entity ? CourseMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Course['id'][]): Promise<Course[]> {
    const entities = await this.courseRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => CourseMapper.toDomain(entity));
  }

  async findBySlug(slug: Course['slug']): Promise<NullableType<Course>> {
    const entity = await this.courseRepository.findOne({
      where: { slug },
    });

    return entity ? CourseMapper.toDomain(entity) : null;
  }

  async countByLevelId(levelId: string): Promise<number> {
    return this.courseRepository.count({
      where: { level: { id: levelId } },
    });
  }

  async countByCategoryId(categoryId: string): Promise<number> {
    return this.courseRepository.count({
      where: { category: { id: categoryId } },
    });
  }

  async update(id: Course['id'], payload: Partial<Course>): Promise<Course> {
    const entity = await this.courseRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.courseRepository.save(
      this.courseRepository.create(
        CourseMapper.toPersistence({
          ...CourseMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return CourseMapper.toDomain(updatedEntity);
  }

  async remove(id: Course['id']): Promise<void> {
    await this.courseRepository.delete(id);
  }
}
