import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { CourseCatalogService } from './course-catalog.service';

describe('CourseCatalogService', () => {
  let service: CourseCatalogService;
  let coursesService: { findCatalog: jest.Mock<any> };

  const publishedCourse = {
    id: 'course-1',
    slug: 'career-basics',
    title: 'Career Basics',
    thumbnailUrl: 'https://cdn/thumb.png',
    shortDescription: 'A short one',
    instructor: { id: 7, fullName: 'Jane Doe' },
    level: { id: 'level-1', name: 'Beginner' },
    totalDurationSecs: 3600,
    price: 0,
    isFree: true,
    avgRating: 4.5,
    totalEnrollments: 128,
  };

  beforeEach(() => {
    coursesService = { findCatalog: jest.fn() };
    coursesService.findCatalog.mockResolvedValue({ data: [], total: 0 });

    service = new CourseCatalogService(coursesService as any);
  });

  describe('findCatalog', () => {
    it('should map a course row to the card shape', async () => {
      coursesService.findCatalog.mockResolvedValue({
        data: [publishedCourse],
        total: 1,
      });

      const result = await service.findCatalog({});

      expect(result.data).toEqual([
        {
          id: 'course-1',
          slug: 'career-basics',
          title: 'Career Basics',
          thumbnailUrl: 'https://cdn/thumb.png',
          shortDescription: 'A short one',
          instructorName: 'Jane Doe',
          level: { id: 'level-1', name: 'Beginner' },
          totalDurationSecs: 3600,
          price: 0,
          isFree: true,
          avgRating: 4.5,
          totalEnrollments: 128,
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
      expect(card.instructorName).toBeNull();
      expect(card.level).toBeNull();
      expect(card.avgRating).toBeNull();
      expect(card.totalDurationSecs).toBe(0);
      expect(card.totalEnrollments).toBe(0);
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
        groupId: 'group-1',
        categoryId: 'cat-1',
        levelId: 'level-1',
        minPrice: 10,
        maxPrice: 200,
        isFree: false,
        language: 'vi',
        instructorId: 7,
        minRating: 4,
      });

      expect(coursesService.findCatalog).toHaveBeenCalledWith({
        filterOptions: {
          search: 'career',
          groupId: 'group-1',
          categoryId: 'cat-1',
          levelId: 'level-1',
          minPrice: 10,
          maxPrice: 200,
          isFree: false,
          language: 'vi',
          instructorId: 7,
          minRating: 4,
        },
        paginationOptions: { page: 1, limit: 12 },
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
