import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { CoursesService } from './courses.service';

describe('CoursesService', () => {
  let service: CoursesService;

  let usersService: { findById: jest.Mock<any> };
  let masterDataCodesService: { findById: jest.Mock<any> };
  let courseRepository: {
    update: jest.Mock<any>;
  };

  beforeEach(() => {
    usersService = { findById: jest.fn() };
    masterDataCodesService = { findById: jest.fn() };
    courseRepository = { update: jest.fn() };

    service = new CoursesService(
      usersService as any,
      masterDataCodesService as any,
      courseRepository as any,
    );
  });

  describe('update', () => {
    it('should not pass undefined-valued fields through to the repository on a partial update', async () => {
      // Mirrors what a real NestJS-instantiated UpdateCourseDto looks like:
      // every declared field is an own property, undefined when the caller
      // omitted it from the request body.
      const dto = {
        createdBy: undefined,
        publishedBy: undefined,
        publishedAt: undefined,
        avgRating: undefined,
        totalEnrollments: undefined,
        totalDurationSecs: undefined,
        totalLectures: undefined,
        totalSections: undefined,
        instructor: undefined,
        category: undefined,
        level: undefined,
        status: undefined,
        enrollmentOpen: undefined,
        hasCertificate: undefined,
        isFree: undefined,
        price: undefined,
        language: undefined,
        introVideoUrl: undefined,
        thumbnailUrl: undefined,
        fullDescription: undefined,
        shortDescription: 'Only this changes',
        title: undefined,
        slug: undefined,
      };

      await service.update('course-1', dto as any);

      expect(courseRepository.update).toHaveBeenCalledTimes(1);
      const payload = courseRepository.update.mock.calls[0][1] as Record<
        string,
        unknown
      >;

      expect(payload).toEqual({ shortDescription: 'Only this changes' });
    });

    it('should still allow explicitly clearing a nullable relation with null', async () => {
      const dto = {
        category: null,
        shortDescription: 'x',
      };

      await service.update('course-1', dto as any);

      const payload = courseRepository.update.mock.calls[0][1] as Record<
        string,
        unknown
      >;

      expect(payload.category).toBeNull();
    });
  });
});
