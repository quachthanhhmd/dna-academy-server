import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, In } from 'typeorm';
import { CourseEntity } from '../entities/course.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Course } from '../../../../domain/course';
import {
  CatalogSort,
  CourseCatalogFilterOptions,
  CourseRepository,
  resolveCatalogSort,
} from '../../course.repository';
import { CourseMapper } from '../mappers/course.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import {
  CATALOG_RANK_ALIAS,
  SEARCH_LIKE_PARAM,
  SEARCH_TERM_PARAM,
  searchMatchSql,
  searchRankSql,
  unaccentIlikeSql,
} from '../course-search.sql';

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
      instructorId?: string;
    } | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Course[]> {
    const query = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.level', 'level')
      .leftJoinAndSelect('course.category', 'category');

    if (filterOptions?.status) {
      query.andWhere('course.status = :status', {
        status: filterOptions.status,
      });
    }
    if (filterOptions?.levelId) {
      query.andWhere('level.id = :levelId', { levelId: filterOptions.levelId });
    }
    if (filterOptions?.categoryId) {
      query.andWhere('category.id = :categoryId', {
        categoryId: filterOptions.categoryId,
      });
    }
    // Since Epic 5 the instructor lives in the course_instructor join table,
    // so the filter matches a course where the instructor holds any role.
    if (filterOptions?.instructorId) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM "course_instructor" "ci"
          WHERE "ci"."courseId" = course.id
            AND "ci"."instructorId" = :instructorId
        )`,
        { instructorId: filterOptions.instructorId },
      );
    }

    const entities = await query
      .orderBy('course.createdAt', 'DESC')
      .skip((paginationOptions.page - 1) * paginationOptions.limit)
      .take(paginationOptions.limit)
      .getMany();

    return entities.map((entity) => CourseMapper.toDomain(entity));
  }

  async findCatalog({
    filterOptions,
    sortBy,
    paginationOptions,
  }: {
    filterOptions?: CourseCatalogFilterOptions | null;
    sortBy?: CatalogSort | null;
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: Course[]; total: number }> {
    const query = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.level', 'level')
      .leftJoinAndSelect('course.category', 'category')
      .where('course.status = :status', { status: 'published' })
      .andWhere('course.enrollmentOpen = true');

    // Epic 4.4 §1.5 — full-text search.
    //
    // The stored `searchVector` covers title / short / full description with
    // A/B/C weights, normalised through the `vi_unaccent` configuration, so
    // `khoa hoc` matches "Khoá học" and word order does not matter. Instructor
    // and category names cannot live in a generated column (other tables), so
    // they stay EXISTS sub-queries OR-ed alongside — unindexed and unranked,
    // but at least diacritic-insensitive, which a raw ILIKE was not.
    const hasSearch = Boolean(filterOptions?.search);

    if (filterOptions?.search) {
      query.setParameters({
        [SEARCH_TERM_PARAM]: filterOptions.search,
        [SEARCH_LIKE_PARAM]: `%${filterOptions.search}%`,
      });

      query.andWhere(
        new Brackets((qb) => {
          qb.where(searchMatchSql('course'))
            .orWhere(
              `EXISTS (
                SELECT 1 FROM "course_instructor" "ci"
                JOIN "instructor" "i" ON "i"."id" = "ci"."instructorId"
                WHERE "ci"."courseId" = course.id
                  AND (${unaccentIlikeSql('"i"."fullName"', SEARCH_LIKE_PARAM)}
                       OR ${unaccentIlikeSql('COALESCE("i"."headline", \'\')', SEARCH_LIKE_PARAM)})
              )`,
            )
            // §6 Q3 — the category name is in the haystack. It is why a search
            // for "biology" can return a course whose title never says so.
            .orWhere(
              unaccentIlikeSql(
                "COALESCE(category.name, '')",
                SEARCH_LIKE_PARAM,
              ),
            );
        }),
      );
    }

    // §1.2 — OR within a dimension, AND across dimensions. Each guard is on
    // `.length`, so an empty array is no filter rather than `IN ()`.
    if (filterOptions?.groupIds?.length) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM "course_group_assignment" "cga"
          WHERE "cga"."courseId" = course.id
            AND "cga"."groupId" IN (:...groupIds)
        )`,
        { groupIds: filterOptions.groupIds },
      );
    }

    if (filterOptions?.categoryIds?.length) {
      query.andWhere('category.id IN (:...categoryIds)', {
        categoryIds: filterOptions.categoryIds,
      });
    }

    if (filterOptions?.levelIds?.length) {
      query.andWhere('level.id IN (:...levelIds)', {
        levelIds: filterOptions.levelIds,
      });
    }

    if (filterOptions?.instructorIds?.length) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM "course_instructor" "ci2"
          WHERE "ci2"."courseId" = course.id
            AND "ci2"."instructorId" IN (:...instructorIds)
        )`,
        { instructorIds: filterOptions.instructorIds },
      );
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

    if (filterOptions?.minDurationSecs !== undefined) {
      query.andWhere('course.totalDurationSecs >= :minDurationSecs', {
        minDurationSecs: filterOptions.minDurationSecs,
      });
    }

    if (filterOptions?.maxDurationSecs !== undefined) {
      query.andWhere('course.totalDurationSecs <= :maxDurationSecs', {
        maxDurationSecs: filterOptions.maxDurationSecs,
      });
    }

    if (filterOptions?.hasCertificate !== undefined) {
      query.andWhere('course.hasCertificate = :hasCertificate', {
        hasCertificate: filterOptions.hasCertificate,
      });
    }

    if (filterOptions?.minRating !== undefined) {
      query.andWhere('course.avgRating >= :minRating', {
        minRating: filterOptions.minRating,
      });
    }

    // Epic 4 v2 §2.2 — catalog sort. NULLS LAST keeps unrated/zero-length
    // courses out of the top slots on a descending sort.
    switch (resolveCatalogSort(sortBy, hasSearch)) {
      // §1.5 — best match first. `resolveCatalogSort` has already degraded
      // this to 'newest' when there is no term, so `searchRankSql` can never
      // be reached without its bound parameter.
      //
      // The rank is selected under an alias and ordered by *that*, not by the
      // expression: TypeORM resolves an `orderBy` string by splitting it on
      // '.', so `ts_rank(course."searchVector", …)` is read as the alias
      // `ts_rank(course` and every search 500s. Ordering by a selected alias
      // is also what lets the expression survive the DISTINCT sub-query
      // TypeORM wraps a paginated join query in.
      case 'relevance':
        query.addSelect(searchRankSql('course'), CATALOG_RANK_ALIAS);
        query.orderBy(CATALOG_RANK_ALIAS, 'DESC');
        break;
      case 'most_popular':
        query.orderBy('course.totalEnrollments', 'DESC', 'NULLS LAST');
        break;
      case 'highest_rated':
        query.orderBy('course.avgRating', 'DESC', 'NULLS LAST');
        break;
      case 'shortest':
        query.orderBy('course.totalDurationSecs', 'ASC', 'NULLS LAST');
        break;
      case 'longest':
        query.orderBy('course.totalDurationSecs', 'DESC', 'NULLS LAST');
        break;
      case 'newest':
      default:
        query.orderBy('course.publishedAt', 'DESC', 'NULLS LAST');
        break;
    }
    // Deterministic tiebreak so pagination cannot repeat or skip a row.
    query.addOrderBy('course.id', 'ASC');

    const [entities, total] = await query
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

  async findByCourseId(courseId: string): Promise<NullableType<Course>> {
    const entity = await this.courseRepository.findOne({
      where: { courseId },
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
          ...omitUndefined(payload),
        }),
      ),
    );

    return CourseMapper.toDomain(updatedEntity);
  }

  async remove(id: Course['id']): Promise<void> {
    await this.courseRepository.delete(id);
  }
}
