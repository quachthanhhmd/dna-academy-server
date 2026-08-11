import { Injectable } from '@nestjs/common';
import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import { FindCoursesCatalogDto } from './dto/find-courses-catalog.dto';
import { CourseCardDto, CourseCatalogResponseDto } from './dto/course-card.dto';

export const CATALOG_DEFAULT_LIMIT = 12;
export const CATALOG_MAX_LIMIT = 50;

@Injectable()
export class CourseCatalogService {
  constructor(private readonly coursesService: CoursesService) {}

  async findCatalog(
    query: FindCoursesCatalogDto,
  ): Promise<CourseCatalogResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(
      query.limit ?? CATALOG_DEFAULT_LIMIT,
      CATALOG_MAX_LIMIT,
    );

    const { data, total } = await this.coursesService.findCatalog({
      filterOptions: {
        search: query.search || undefined,
        groupId: query.groupId,
        categoryId: query.categoryId,
        levelId: query.levelId,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        isFree: query.isFree,
        language: query.language,
        instructorId: query.instructorId,
        minRating: query.minRating,
      },
      paginationOptions: { page, limit },
    });

    return {
      data: data.map((course) => this.toCard(course)),
      totalCount: total,
      page,
      limit,
      hasNextPage: page * limit < total,
    };
  }

  private toCard(course: Course): CourseCardDto {
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      thumbnailUrl: course.thumbnailUrl ?? null,
      shortDescription: course.shortDescription ?? null,
      instructorName: course.instructor?.fullName ?? null,
      level: course.level
        ? { id: course.level.id, name: course.level.name }
        : null,
      totalDurationSecs: course.totalDurationSecs ?? 0,
      price: course.price,
      isFree: course.isFree,
      avgRating: course.avgRating ?? null,
      totalEnrollments: course.totalEnrollments ?? 0,
    };
  }
}
