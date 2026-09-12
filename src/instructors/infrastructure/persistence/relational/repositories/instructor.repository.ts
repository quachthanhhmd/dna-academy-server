import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, In } from 'typeorm';
import { InstructorEntity } from '../entities/instructor.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Instructor } from '../../../../domain/instructor';
import {
  InstructorFilterOptions,
  InstructorRepository,
  InstructorSortOptions,
} from '../../instructor.repository';
import { InstructorMapper } from '../mappers/instructor.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class InstructorRelationalRepository implements InstructorRepository {
  constructor(
    @InjectRepository(InstructorEntity)
    private readonly instructorRepository: Repository<InstructorEntity>,
  ) {}

  async create(data: Instructor): Promise<Instructor> {
    const persistenceModel = InstructorMapper.toPersistence(data);
    const newEntity = await this.instructorRepository.save(
      this.instructorRepository.create(persistenceModel),
    );
    return InstructorMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: InstructorFilterOptions | null;
    sortOptions?: InstructorSortOptions | null;
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: Instructor[]; total: number }> {
    const query = this.instructorRepository
      .createQueryBuilder('instructor')
      .leftJoinAndSelect('instructor.user', 'user');

    if (filterOptions?.search) {
      const term = `%${filterOptions.search}%`;
      query.andWhere(
        new Brackets((qb) => {
          qb.where('instructor.fullName ILIKE :term', { term }).orWhere(
            'instructor.headline ILIKE :term',
            { term },
          );
        }),
      );
    }

    if (filterOptions?.isActive !== undefined) {
      query.andWhere('instructor.isActive = :isActive', {
        isActive: filterOptions.isActive,
      });
    }

    if (filterOptions?.expertiseCodeId) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM "instructor_expertise" "ie"
          WHERE "ie"."instructorId" = instructor.id
            AND "ie"."expertiseCodeId" = :expertiseCodeId
        )`,
        { expertiseCodeId: filterOptions.expertiseCodeId },
      );
    }

    if (filterOptions?.hasPublishedCourse) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM "course_instructor" "ci"
          JOIN "course" "c" ON "c"."id" = "ci"."courseId"
          WHERE "ci"."instructorId" = instructor.id
            AND "c"."status" = 'published'
        )`,
      );
    }

    const sortField = sortOptions?.field ?? 'displayOrder';
    const sortOrder = sortOptions?.order ?? 'ASC';

    // NULLS LAST keeps un-rated instructors at the bottom of a rating sort
    // rather than at the top, which is what Postgres does by default for DESC.
    query.orderBy(`instructor.${sortField}`, sortOrder, 'NULLS LAST');
    if (sortField !== 'fullName') {
      query.addOrderBy('instructor.fullName', 'ASC');
    }

    const [entities, total] = await query
      .skip((paginationOptions.page - 1) * paginationOptions.limit)
      .take(paginationOptions.limit)
      .getManyAndCount();

    return {
      data: entities.map((entity) => InstructorMapper.toDomain(entity)),
      total,
    };
  }

  async findById(id: Instructor['id']): Promise<NullableType<Instructor>> {
    const entity = await this.instructorRepository.findOne({ where: { id } });

    return entity ? InstructorMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Instructor['id'][]): Promise<Instructor[]> {
    if (!ids.length) {
      return [];
    }

    const entities = await this.instructorRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => InstructorMapper.toDomain(entity));
  }

  async findBySlug(
    slug: Instructor['slug'],
  ): Promise<NullableType<Instructor>> {
    const entity = await this.instructorRepository.findOne({ where: { slug } });

    return entity ? InstructorMapper.toDomain(entity) : null;
  }

  async findByUserId(userId: number): Promise<NullableType<Instructor>> {
    const entity = await this.instructorRepository.findOne({
      where: { user: { id: userId } },
    });

    return entity ? InstructorMapper.toDomain(entity) : null;
  }

  async update(
    id: Instructor['id'],
    payload: Partial<Instructor>,
  ): Promise<Instructor> {
    const entity = await this.instructorRepository.findOne({ where: { id } });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.instructorRepository.save(
      this.instructorRepository.create(
        InstructorMapper.toPersistence({
          ...InstructorMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return InstructorMapper.toDomain(updatedEntity);
  }

  async remove(id: Instructor['id']): Promise<void> {
    await this.instructorRepository.delete(id);
  }
}
