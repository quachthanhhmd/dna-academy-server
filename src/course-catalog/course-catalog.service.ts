import { Injectable } from '@nestjs/common';
import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import { resolveCatalogSort } from '../courses/infrastructure/persistence/course.repository';
import { FindCoursesCatalogDto } from './dto/find-courses-catalog.dto';
import { CourseCardDto, CourseCatalogResponseDto } from './dto/course-card.dto';
import {
  CourseInstructorsService,
  CourseInstructorsView,
} from '../course-instructors/course-instructors.service';
import { CourseGroupAssignmentsService } from '../course-group-assignments/course-group-assignments.service';
import { LecturesService } from '../lectures/lectures.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { mergeIdFilters } from '../utils/parse-id-list';

export const CATALOG_DEFAULT_LIMIT = 12;
export const CATALOG_MAX_LIMIT = 50;

@Injectable()
export class CourseCatalogService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly courseInstructorsService: CourseInstructorsService,
    private readonly courseGroupAssignmentsService: CourseGroupAssignmentsService,
    private readonly lecturesService: LecturesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  /**
   * The public catalog.
   *
   * `viewerId` is optional (Epic 4.4 §1.4, option A): the endpoint is guarded
   * by `AuthGuard(['jwt','anonymous'])`, so a signed-in caller gets
   * `isEnrolled` on each card and an anonymous one gets the same page without
   * it — and without the query that would produce it.
   */
  async findCatalog(
    query: FindCoursesCatalogDto,
    viewerId?: number,
  ): Promise<CourseCatalogResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(
      query.limit ?? CATALOG_DEFAULT_LIMIT,
      CATALOG_MAX_LIMIT,
    );

    // A blank term is not a search. It has to collapse to `undefined` here or
    // `relevance` would be resolved against an empty tsquery — a constant
    // rank, i.e. an arbitrary order that looks deliberate (§1.5).
    const search = query.search?.trim() || undefined;

    const { data, total } = await this.coursesService.findCatalog({
      filterOptions: {
        search,
        // §1.2 — the deprecated singular params are unioned into their plural
        // replacement rather than ignored; empty collapses to `undefined` so
        // the repository never builds `IN ()`.
        groupIds: mergeIdFilters(query.groupIds, query.groupId),
        categoryIds: mergeIdFilters(query.categoryIds, query.categoryId),
        levelIds: mergeIdFilters(query.levelIds, query.levelId),
        instructorIds: mergeIdFilters(query.instructorIds, query.instructorId),
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        isFree: query.isFree,
        language: query.language,
        minRating: query.minRating,
        minDurationSecs: query.minDurationSecs,
        maxDurationSecs: query.maxDurationSecs,
        hasCertificate: query.hasCertificate,
      },
      sortBy: resolveCatalogSort(query.sortBy, Boolean(search)),
      paginationOptions: { page, limit },
    });

    const courseIds = data.map((course) => course.id);

    // One extra query per page rather than per card, for each addition.
    // `Promise.all` because none of them depends on another.
    const [instructorsByCourse, groupIdsByCourse, previewCourseIds, enrolled] =
      courseIds.length
        ? await Promise.all([
            this.courseInstructorsService.findViewByCourseIds(courseIds),
            this.courseGroupAssignmentsService.findGroupIdsByCourseIds(
              courseIds,
            ),
            this.lecturesService.findPreviewCourseIds(courseIds),
            viewerId === undefined
              ? Promise.resolve(new Set<string>())
              : this.enrollmentsService.findEnrolledCourseIds(
                  viewerId,
                  courseIds,
                ),
          ])
        : [
            new Map<string, CourseInstructorsView>(),
            new Map<string, string[]>(),
            new Set<string>(),
            new Set<string>(),
          ];

    return {
      data: data.map((course) =>
        this.toCard(course, {
          instructors: instructorsByCourse.get(course.id),
          groupIds: groupIdsByCourse.get(course.id) ?? [],
          hasPreview: previewCourseIds.has(course.id),
          isEnrolled: enrolled.has(course.id),
        }),
      ),
      totalCount: total,
      page,
      limit,
      hasNextPage: page * limit < total,
    };
  }

  private toCard(
    course: Course,
    extras: {
      instructors?: CourseInstructorsView;
      groupIds: string[];
      hasPreview: boolean;
      isEnrolled: boolean;
    },
  ): CourseCardDto {
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      thumbnailUrl: course.thumbnailUrl ?? null,
      shortDescription: course.shortDescription ?? null,
      primaryInstructor: extras.instructors?.primaryInstructor ?? null,
      coInstructorCount: extras.instructors?.coInstructors.length ?? 0,
      level: course.level
        ? { id: course.level.id, name: course.level.name }
        : null,
      totalDurationSecs: course.totalDurationSecs ?? 0,
      price: course.price,
      isFree: course.isFree,
      // Null, never 0 — an unrated course must render no stars rather than
      // zero stars (§1.3, AC-8).
      avgRating: course.avgRating ?? null,
      totalEnrollments: course.totalEnrollments ?? 0,
      // Epic 4.4 §1.3
      language: course.language,
      groupIds: extras.groupIds,
      hasPreview: extras.hasPreview,
      isEnrolled: extras.isEnrolled,
    };
  }
}
