import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

import { MasterDataCodesService } from '../master-data-codes/master-data-codes.service';
import { MasterDataCode } from '../master-data-codes/domain/master-data-code';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  CatalogSort,
  CourseCatalogFilterOptions,
  CourseRepository,
} from './infrastructure/persistence/course.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { DeepPartial } from '../utils/types/deep-partial.type';
import { Course } from './domain/course';

@Injectable()
export class CoursesService {
  constructor(
    private readonly userService: UsersService,

    private readonly masterDataCodeService: MasterDataCodesService,

    // Dependencies here
    private readonly courseRepository: CourseRepository,
  ) {}

  async create(createCourseDto: CreateCourseDto) {
    // Do not remove comment below.
    // <creating-property />
    let createdBy: User | null | undefined = undefined;

    if (createCourseDto.createdBy) {
      const createdByObject = await this.userService.findById(
        createCourseDto.createdBy.id,
      );
      if (!createdByObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            createdBy: 'notExists',
          },
        });
      }
      createdBy = createdByObject;
    } else if (createCourseDto.createdBy === null) {
      createdBy = null;
    }

    let publishedBy: User | null | undefined = undefined;

    if (createCourseDto.publishedBy) {
      const publishedByObject = await this.userService.findById(
        createCourseDto.publishedBy.id,
      );
      if (!publishedByObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            publishedBy: 'notExists',
          },
        });
      }
      publishedBy = publishedByObject;
    } else if (createCourseDto.publishedBy === null) {
      publishedBy = null;
    }

    let category: MasterDataCode | null | undefined = undefined;

    if (createCourseDto.category) {
      const categoryObject = await this.masterDataCodeService.findById(
        createCourseDto.category.id,
      );
      if (!categoryObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            category: 'notExists',
          },
        });
      }
      category = categoryObject;
    } else if (createCourseDto.category === null) {
      category = null;
    }

    let level: MasterDataCode | null | undefined = undefined;

    if (createCourseDto.level) {
      const levelObject = await this.masterDataCodeService.findById(
        createCourseDto.level.id,
      );
      if (!levelObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            level: 'notExists',
          },
        });
      }
      level = levelObject;
    } else if (createCourseDto.level === null) {
      level = null;
    }

    return this.courseRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      courseId: createCourseDto.courseId,

      createdBy,

      publishedBy,

      publishedAt: createCourseDto.publishedAt,

      unpublishedAt: createCourseDto.unpublishedAt,

      requiresSequentialCompletion:
        createCourseDto.requiresSequentialCompletion ?? false,

      avgRating: createCourseDto.avgRating,

      totalEnrollments: createCourseDto.totalEnrollments,

      totalDurationSecs: createCourseDto.totalDurationSecs,

      totalLectures: createCourseDto.totalLectures,

      totalSections: createCourseDto.totalSections,

      category,

      level,

      status: createCourseDto.status,

      enrollmentOpen: createCourseDto.enrollmentOpen,

      hasCertificate: createCourseDto.hasCertificate,

      isFree: createCourseDto.isFree,

      price: createCourseDto.price,

      language: createCourseDto.language,

      introVideoUrl: createCourseDto.introVideoUrl,

      thumbnailUrl: createCourseDto.thumbnailUrl,

      fullDescription: createCourseDto.fullDescription,

      shortDescription: createCourseDto.shortDescription,

      title: createCourseDto.title,

      slug: createCourseDto.slug,
    });
  }

  findAllWithPagination({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: {
      status?: string;
      levelId?: string;
      categoryId?: string;
      instructorId?: string;
      /** Permission model §1.8 — only these courses; empty means none. */
      courseIds?: string[];
    } | null;
    paginationOptions: IPaginationOptions;
  }) {
    return this.courseRepository.findAllWithPagination({
      filterOptions,
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findCatalog({
    filterOptions,
    sortBy,
    paginationOptions,
  }: {
    filterOptions?: CourseCatalogFilterOptions | null;
    sortBy?: CatalogSort | null;
    paginationOptions: IPaginationOptions;
  }) {
    return this.courseRepository.findCatalog({
      filterOptions,
      sortBy,
      paginationOptions,
    });
  }

  findById(id: Course['id']) {
    return this.courseRepository.findById(id);
  }

  findByIds(ids: Course['id'][]) {
    return this.courseRepository.findByIds(ids);
  }

  findBySlug(slug: Course['slug']) {
    return this.courseRepository.findBySlug(slug);
  }

  findByCourseId(courseId: string) {
    return this.courseRepository.findByCourseId(courseId);
  }

  countByLevelId(levelId: string) {
    return this.courseRepository.countByLevelId(levelId);
  }

  countByCategoryId(categoryId: string) {
    return this.courseRepository.countByCategoryId(categoryId);
  }

  async update(
    id: Course['id'],

    updateCourseDto: UpdateCourseDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let createdBy: User | null | undefined = undefined;

    if (updateCourseDto.createdBy) {
      const createdByObject = await this.userService.findById(
        updateCourseDto.createdBy.id,
      );
      if (!createdByObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            createdBy: 'notExists',
          },
        });
      }
      createdBy = createdByObject;
    } else if (updateCourseDto.createdBy === null) {
      createdBy = null;
    }

    let publishedBy: User | null | undefined = undefined;

    if (updateCourseDto.publishedBy) {
      const publishedByObject = await this.userService.findById(
        updateCourseDto.publishedBy.id,
      );
      if (!publishedByObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            publishedBy: 'notExists',
          },
        });
      }
      publishedBy = publishedByObject;
    } else if (updateCourseDto.publishedBy === null) {
      publishedBy = null;
    }

    let category: MasterDataCode | null | undefined = undefined;

    if (updateCourseDto.category) {
      const categoryObject = await this.masterDataCodeService.findById(
        updateCourseDto.category.id,
      );
      if (!categoryObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            category: 'notExists',
          },
        });
      }
      category = categoryObject;
    } else if (updateCourseDto.category === null) {
      category = null;
    }

    let level: MasterDataCode | null | undefined = undefined;

    if (updateCourseDto.level) {
      const levelObject = await this.masterDataCodeService.findById(
        updateCourseDto.level.id,
      );
      if (!levelObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            level: 'notExists',
          },
        });
      }
      level = levelObject;
    } else if (updateCourseDto.level === null) {
      level = null;
    }

    const payload: DeepPartial<Course> = {
      // Do not remove comment below.
      // <updating-property-payload />
      courseId: updateCourseDto.courseId,

      createdBy,

      publishedBy,

      publishedAt: updateCourseDto.publishedAt,

      unpublishedAt: updateCourseDto.unpublishedAt,

      requiresSequentialCompletion:
        updateCourseDto.requiresSequentialCompletion,

      avgRating: updateCourseDto.avgRating,

      totalEnrollments: updateCourseDto.totalEnrollments,

      totalDurationSecs: updateCourseDto.totalDurationSecs,

      totalLectures: updateCourseDto.totalLectures,

      totalSections: updateCourseDto.totalSections,

      category,

      level,

      status: updateCourseDto.status,

      enrollmentOpen: updateCourseDto.enrollmentOpen,

      hasCertificate: updateCourseDto.hasCertificate,

      isFree: updateCourseDto.isFree,

      price: updateCourseDto.price,

      language: updateCourseDto.language,

      introVideoUrl: updateCourseDto.introVideoUrl,

      thumbnailUrl: updateCourseDto.thumbnailUrl,

      fullDescription: updateCourseDto.fullDescription,

      shortDescription: updateCourseDto.shortDescription,

      title: updateCourseDto.title,

      slug: updateCourseDto.slug,
    };

    // A partial update DTO instance carries every declared field as an own
    // property (undefined when the caller omitted it). Listing every field
    // above — required so relation fields can be tri-stated (unset/null/id)
    // — means this object has the same undefined keys. Strip them so the
    // repository's `{ ...current, ...payload }` merge can't clobber existing
    // column values with undefined.
    for (const key of Object.keys(payload) as (keyof Course)[]) {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    }

    return this.courseRepository.update(id, payload);
  }

  remove(id: Course['id']) {
    return this.courseRepository.remove(id);
  }
}
