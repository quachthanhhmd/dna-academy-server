import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { CourseCatalogService } from './course-catalog.service';

describe('CourseCatalogService', () => {
  let service: CourseCatalogService;
  let coursesService: { findCatalog: jest.Mock<any> };
  let courseInstructorsService: { findViewByCourseIds: jest.Mock<any> };
  let courseGroupAssignmentsService: {
    findGroupIdsByCourseIds: jest.Mock<any>;
  };
  let lecturesService: { findPreviewCourseIds: jest.Mock<any> };
  let enrollmentsService: { findEnrolledCourseIds: jest.Mock<any> };

  const instructorRef = (id: string, fullName: string) => ({
    id,
    slug: `slug-${id}`,
    fullName,
    headline: null,
    profilePictureUrl: null,
  });

  const publishedCourse = {
    id: 'course-1',
    slug: 'career-basics',
    title: 'Career Basics',
    thumbnailUrl: 'https://cdn/thumb.png',
    shortDescription: 'A short one',
    level: { id: 'level-1', name: 'Beginner' },
    totalDurationSecs: 3600,
    price: 0,
    isFree: true,
    language: 'vi',
    avgRating: 4.5,
    totalEnrollments: 128,
  };

  beforeEach(() => {
    coursesService = { findCatalog: jest.fn() };
    coursesService.findCatalog.mockResolvedValue({ data: [], total: 0 });
    courseInstructorsService = { findViewByCourseIds: jest.fn() };
    courseInstructorsService.findViewByCourseIds.mockResolvedValue(new Map());
    courseGroupAssignmentsService = { findGroupIdsByCourseIds: jest.fn() };
    courseGroupAssignmentsService.findGroupIdsByCourseIds.mockResolvedValue(
      new Map(),
    );
    lecturesService = { findPreviewCourseIds: jest.fn() };
    lecturesService.findPreviewCourseIds.mockResolvedValue(new Set());
    enrollmentsService = { findEnrolledCourseIds: jest.fn() };
    enrollmentsService.findEnrolledCourseIds.mockResolvedValue(new Set());

    service = new CourseCatalogService(
      coursesService as any,
      courseInstructorsService as any,
      courseGroupAssignmentsService as any,
      lecturesService as any,
      enrollmentsService as any,
    );
  });

  describe('findCatalog', () => {
    it('should map a course row to the card shape', async () => {
      coursesService.findCatalog.mockResolvedValue({
        data: [publishedCourse],
        total: 1,
      });

      courseInstructorsService.findViewByCourseIds.mockResolvedValue(
        new Map([
          [
            'course-1',
            {
              primaryInstructor: instructorRef('ins-1', 'Jane Doe'),
              coInstructors: [instructorRef('ins-2', 'John Roe')],
            },
          ],
        ]),
      );
      courseGroupAssignmentsService.findGroupIdsByCourseIds.mockResolvedValue(
        new Map([['course-1', ['group-1', 'group-2']]]),
      );
      lecturesService.findPreviewCourseIds.mockResolvedValue(
        new Set(['course-1']),
      );

      const result = await service.findCatalog({});

      expect(result.data).toEqual([
        {
          id: 'course-1',
          slug: 'career-basics',
          title: 'Career Basics',
          thumbnailUrl: 'https://cdn/thumb.png',
          shortDescription: 'A short one',
          primaryInstructor: instructorRef('ins-1', 'Jane Doe'),
          coInstructorCount: 1,
          level: { id: 'level-1', name: 'Beginner' },
          totalDurationSecs: 3600,
          price: 0,
          isFree: true,
          avgRating: 4.5,
          totalEnrollments: 128,
          // Epic 4.4 §1.3
          language: 'vi',
          groupIds: ['group-1', 'group-2'],
          hasPreview: true,
          isEnrolled: false,
        },
      ]);
    });

    it('should null out optional card fields rather than emitting undefined', async () => {
      coursesService.findCatalog.mockResolvedValue({
        data: [
          {
            id: 'course-2',
            slug: 'bare',
            title: 'Bare',
            price: 100,
            isFree: false,
          },
        ],
        total: 1,
      });

      const [card] = (await service.findCatalog({})).data;

      expect(card.thumbnailUrl).toBeNull();
      expect(card.shortDescription).toBeNull();
      expect(card.primaryInstructor).toBeNull();
      expect(card.coInstructorCount).toBe(0);
      expect(card.level).toBeNull();
      expect(card.avgRating).toBeNull();
      expect(card.totalDurationSecs).toBe(0);
      expect(card.totalEnrollments).toBe(0);
    });

    /**
     * §1.3 / AC-8 — an unrated course must not render zero stars, and a course
     * with no group assignments must give the pills an empty array to iterate
     * rather than `undefined` to crash on.
     */
    it('should give the new card fields safe empties when nothing is assigned', async () => {
      coursesService.findCatalog.mockResolvedValue({
        data: [{ id: 'course-2', slug: 'bare', title: 'Bare', price: 0 }],
        total: 1,
      });

      const [card] = (await service.findCatalog({})).data;

      expect(card.groupIds).toEqual([]);
      expect(card.hasPreview).toBe(false);
      expect(card.isEnrolled).toBe(false);
      expect(card.avgRating).toBeNull();
    });

    it('should default to page 1 and a limit of 12', async () => {
      await service.findCatalog({});

      expect(coursesService.findCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          paginationOptions: { page: 1, limit: 12 },
        }),
      );
    });

    it('should cap the limit at 50 so a caller cannot request the whole table', async () => {
      await service.findCatalog({ limit: 5000 });

      expect(coursesService.findCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          paginationOptions: { page: 1, limit: 50 },
        }),
      );
    });

    it('should forward every filter to the repository', async () => {
      await service.findCatalog({
        search: 'career',
        groupIds: ['group-1', 'group-2'],
        categoryIds: ['cat-1'],
        levelIds: ['level-1'],
        instructorIds: ['ins-1'],
        minPrice: 10,
        maxPrice: 200,
        isFree: false,
        language: 'vi',
        minRating: 4,
      });

      expect(coursesService.findCatalog).toHaveBeenCalledWith({
        sortBy: 'relevance',
        filterOptions: {
          search: 'career',
          groupIds: ['group-1', 'group-2'],
          categoryIds: ['cat-1'],
          levelIds: ['level-1'],
          instructorIds: ['ins-1'],
          minPrice: 10,
          maxPrice: 200,
          isFree: false,
          language: 'vi',
          minRating: 4,
          minDurationSecs: undefined,
          maxDurationSecs: undefined,
          hasCertificate: undefined,
        },
        paginationOptions: { page: 1, limit: 12 },
      });
    });

    /**
     * §1.2 migration — the live client, the header route and every bookmarked
     * catalog URL still send the singular names. They must not become a
     * silent no-op.
     */
    describe('deprecated singular aliases', () => {
      it.each([
        ['groupId', 'groupIds'],
        ['categoryId', 'categoryIds'],
        ['levelId', 'levelIds'],
        ['instructorId', 'instructorIds'],
      ])('should fold %s into %s', async (singular, plural) => {
        await service.findCatalog({ [singular]: 'id-1' } as never);

        expect(coursesService.findCatalog).toHaveBeenCalledWith(
          expect.objectContaining({
            filterOptions: expect.objectContaining({ [plural]: ['id-1'] }),
          }),
        );
      });

      it('should union a singular and a plural sent together', async () => {
        await service.findCatalog({
          groupId: 'group-1',
          groupIds: ['group-2'],
        } as never);

        expect(coursesService.findCatalog).toHaveBeenCalledWith(
          expect.objectContaining({
            filterOptions: expect.objectContaining({
              groupIds: ['group-2', 'group-1'],
            }),
          }),
        );
      });

      it('should not duplicate an id sent in both forms', async () => {
        await service.findCatalog({
          groupId: 'group-1',
          groupIds: ['group-1'],
        } as never);

        expect(coursesService.findCatalog).toHaveBeenCalledWith(
          expect.objectContaining({
            filterOptions: expect.objectContaining({ groupIds: ['group-1'] }),
          }),
        );
      });
    });

    /**
     * An empty array must reach the repository as `undefined`. `IN ()` is not
     * valid SQL and a repository that guarded on truthiness alone would treat
     * `[]` as "match nothing" — a filter nobody asked for.
     */
    it('should send an empty plural filter as no filter', async () => {
      await service.findCatalog({ groupIds: [], levelIds: [] } as never);

      expect(coursesService.findCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          filterOptions: expect.objectContaining({
            groupIds: undefined,
            levelIds: undefined,
          }),
        }),
      );
    });

    it('should resolve the instructors for a page in a single lookup', async () => {
      coursesService.findCatalog.mockResolvedValue({
        data: [publishedCourse, { ...publishedCourse, id: 'course-2' }],
        total: 2,
      });

      await service.findCatalog({});

      expect(
        courseInstructorsService.findViewByCourseIds,
      ).toHaveBeenCalledTimes(1);
      expect(courseInstructorsService.findViewByCourseIds).toHaveBeenCalledWith(
        ['course-1', 'course-2'],
      );
    });

    /**
     * §2 BE-2 — every card addition is one query for the whole page, never one
     * per card. A two-row page costing four queries is how a nine-row page
     * costs nineteen.
     */
    it('should batch the group, preview and enrollment lookups once per page', async () => {
      coursesService.findCatalog.mockResolvedValue({
        data: [publishedCourse, { ...publishedCourse, id: 'course-2' }],
        total: 2,
      });

      await service.findCatalog({}, 7);

      expect(
        courseGroupAssignmentsService.findGroupIdsByCourseIds,
      ).toHaveBeenCalledTimes(1);
      expect(
        courseGroupAssignmentsService.findGroupIdsByCourseIds,
      ).toHaveBeenCalledWith(['course-1', 'course-2']);

      expect(lecturesService.findPreviewCourseIds).toHaveBeenCalledTimes(1);
      expect(lecturesService.findPreviewCourseIds).toHaveBeenCalledWith([
        'course-1',
        'course-2',
      ]);

      expect(enrollmentsService.findEnrolledCourseIds).toHaveBeenCalledTimes(1);
      expect(enrollmentsService.findEnrolledCourseIds).toHaveBeenCalledWith(7, [
        'course-1',
        'course-2',
      ]);
    });

    it('should not hit any per-card table for an empty page', async () => {
      await service.findCatalog({}, 7);

      expect(
        courseInstructorsService.findViewByCourseIds,
      ).not.toHaveBeenCalled();
      expect(
        courseGroupAssignmentsService.findGroupIdsByCourseIds,
      ).not.toHaveBeenCalled();
      expect(lecturesService.findPreviewCourseIds).not.toHaveBeenCalled();
      expect(enrollmentsService.findEnrolledCourseIds).not.toHaveBeenCalled();
    });

    /**
     * §1.4 option A — the endpoint is public with optional auth. An anonymous
     * caller has no enrollments to look up, and asking anyway is a wasted
     * query on the hottest public endpoint in the product.
     */
    describe('isEnrolled (§1.4 option A)', () => {
      it('should not query enrollments for an anonymous caller', async () => {
        coursesService.findCatalog.mockResolvedValue({
          data: [publishedCourse],
          total: 1,
        });

        const result = await service.findCatalog({});

        expect(enrollmentsService.findEnrolledCourseIds).not.toHaveBeenCalled();
        expect(result.data[0].isEnrolled).toBe(false);
      });

      it('should flag the courses the signed-in caller is enrolled in', async () => {
        coursesService.findCatalog.mockResolvedValue({
          data: [publishedCourse, { ...publishedCourse, id: 'course-2' }],
          total: 2,
        });
        enrollmentsService.findEnrolledCourseIds.mockResolvedValue(
          new Set(['course-2']),
        );

        const result = await service.findCatalog({}, 7);

        expect(result.data.map((card) => card.isEnrolled)).toEqual([
          false,
          true,
        ]);
      });
    });

    it('should forward the Epic 4 v2 duration and certificate filters', async () => {
      await service.findCatalog({
        minDurationSecs: 0,
        maxDurationSecs: 7200,
        hasCertificate: true,
      } as never);

      expect(coursesService.findCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          filterOptions: expect.objectContaining({
            minDurationSecs: 0,
            maxDurationSecs: 7200,
            hasCertificate: true,
          }),
        }),
      );
    });

    /**
     * §1.5 — the rule that decides whether the tsvector's weights are used or
     * computed and thrown away. Both directions are silent when wrong.
     */
    describe('sort resolution', () => {
      it('should default the sort to newest with no search term', async () => {
        await service.findCatalog({});

        expect(coursesService.findCatalog).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: 'newest' }),
        );
      });

      it('should default the sort to relevance when searching (AC-2e)', async () => {
        await service.findCatalog({ search: 'khoa hoc' });

        expect(coursesService.findCatalog).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: 'relevance' }),
        );
      });

      it('should degrade relevance to newest with no search term (AC-2g)', async () => {
        await service.findCatalog({ sortBy: 'relevance' } as never);

        expect(coursesService.findCatalog).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: 'newest' }),
        );
      });

      it('should degrade relevance to newest for a blank search term', async () => {
        await service.findCatalog({
          sortBy: 'relevance',
          search: '   ',
        } as never);

        expect(coursesService.findCatalog).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: 'newest' }),
        );
      });

      it('should forward an explicit sort', async () => {
        await service.findCatalog({ sortBy: 'highest_rated' } as never);

        expect(coursesService.findCatalog).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: 'highest_rated' }),
        );
      });

      it('should not override an explicit sort while searching', async () => {
        await service.findCatalog({
          search: 'dna',
          sortBy: 'most_popular',
        } as never);

        expect(coursesService.findCatalog).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: 'most_popular' }),
        );
      });
    });

    it('should treat an empty search string as no search filter', async () => {
      await service.findCatalog({ search: '' });

      expect(coursesService.findCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          filterOptions: expect.objectContaining({ search: undefined }),
        }),
      );
    });

    it('should treat a whitespace-only search as no search filter', async () => {
      await service.findCatalog({ search: '   ' });

      expect(coursesService.findCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          filterOptions: expect.objectContaining({ search: undefined }),
        }),
      );
    });

    it('should preserve isFree=false instead of dropping it as falsy', async () => {
      await service.findCatalog({ isFree: false });

      expect(coursesService.findCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          filterOptions: expect.objectContaining({ isFree: false }),
        }),
      );
    });

    it('should report hasNextPage while rows remain', async () => {
      coursesService.findCatalog.mockResolvedValue({
        data: [publishedCourse],
        total: 30,
      });

      const result = await service.findCatalog({ page: 1, limit: 12 });

      expect(result).toMatchObject({
        totalCount: 30,
        page: 1,
        limit: 12,
        hasNextPage: true,
      });
    });

    it('should report hasNextPage=false on the last page', async () => {
      coursesService.findCatalog.mockResolvedValue({
        data: [publishedCourse],
        total: 30,
      });

      const result = await service.findCatalog({ page: 3, limit: 12 });

      expect(result.hasNextPage).toBe(false);
    });

    it('should return an empty result set without failing', async () => {
      const result = await service.findCatalog({ search: 'nothing matches' });

      expect(result.data).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.hasNextPage).toBe(false);
    });
  });
});
