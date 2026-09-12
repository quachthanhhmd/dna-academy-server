import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UnprocessableEntityException } from '@nestjs/common';
import { CourseInstructorsAdminService } from './course-instructors-admin.service';

describe('CourseInstructorsAdminService', () => {
  let service: CourseInstructorsAdminService;

  let courseInstructorsService: {
    create: jest.Mock<any>;
    update: jest.Mock<any>;
    remove: jest.Mock<any>;
    findByCourseId: jest.Mock<any>;
    findByCourseIds: jest.Mock<any>;
    findViewByCourseId: jest.Mock<any>;
    findViewByCourseIds: jest.Mock<any>;
    removeByCourseId: jest.Mock<any>;
  };
  let instructorsService: { findById: jest.Mock<any> };
  let instructorStatsService: { recomputeMany: jest.Mock<any> };

  const instructor = (id: string, isActive = true) => ({
    id,
    isActive,
    slug: `slug-${id}`,
    fullName: `Instructor ${id}`,
    headline: null,
    profilePictureUrl: null,
  });

  beforeEach(() => {
    courseInstructorsService = {
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findByCourseId: jest.fn(),
      findByCourseIds: jest.fn(),
      findViewByCourseId: jest.fn(),
      findViewByCourseIds: jest.fn(),
      removeByCourseId: jest.fn(),
    };
    instructorsService = { findById: jest.fn() };
    instructorStatsService = { recomputeMany: jest.fn() };

    courseInstructorsService.findByCourseId.mockResolvedValue([]);
    instructorsService.findById.mockImplementation((id: string) =>
      Promise.resolve(instructor(id)),
    );
    instructorStatsService.recomputeMany.mockResolvedValue(undefined);

    service = new CourseInstructorsAdminService(
      courseInstructorsService as any,
      instructorsService as any,
      instructorStatsService as any,
    );
  });

  describe('assign', () => {
    it('should create a single primary row when only a primary is given', async () => {
      await service.assign('course-1', { primaryInstructorId: 'ins-1' });

      expect(courseInstructorsService.create).toHaveBeenCalledTimes(1);
      expect(courseInstructorsService.create).toHaveBeenCalledWith({
        course: { id: 'course-1' },
        instructor: instructor('ins-1'),
        role: 'primary',
        displayOrder: 0,
      });
    });

    it('should create co-instructor rows in the order they were sent', async () => {
      await service.assign('course-1', {
        primaryInstructorId: 'ins-1',
        coInstructorIds: ['ins-2', 'ins-3'],
      });

      expect(courseInstructorsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          instructor: instructor('ins-2'),
          role: 'co_instructor',
          displayOrder: 1,
        }),
      );
      expect(courseInstructorsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          instructor: instructor('ins-3'),
          role: 'co_instructor',
          displayOrder: 2,
        }),
      );
    });

    it('should reject a co-instructor list that repeats the primary', async () => {
      await expect(
        service.assign('course-1', {
          primaryInstructorId: 'ins-1',
          coInstructorIds: ['ins-1'],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(courseInstructorsService.create).not.toHaveBeenCalled();
    });

    it('should reject co-instructors without a primary', async () => {
      await expect(
        service.assign('course-1', { coInstructorIds: ['ins-2'] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should reject an unknown instructor id', async () => {
      instructorsService.findById.mockResolvedValue(null);

      await expect(
        service.assign('course-1', { primaryInstructorId: 'ghost' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should reject assigning a deactivated instructor that is not already on the course', async () => {
      instructorsService.findById.mockResolvedValue(instructor('ins-1', false));

      await expect(
        service.assign('course-1', { primaryInstructorId: 'ins-1' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should keep a deactivated instructor that is already assigned to the course', async () => {
      courseInstructorsService.findByCourseId.mockResolvedValue([
        {
          id: 'row-1',
          role: 'primary',
          displayOrder: 0,
          instructor: instructor('ins-1', false),
        },
      ]);
      instructorsService.findById.mockResolvedValue(instructor('ins-1', false));

      await expect(
        service.assign('course-1', { primaryInstructorId: 'ins-1' }),
      ).resolves.toBeDefined();
      expect(courseInstructorsService.remove).not.toHaveBeenCalled();
    });

    it('should drop rows for instructors no longer in the payload', async () => {
      courseInstructorsService.findByCourseId.mockResolvedValue([
        {
          id: 'row-1',
          role: 'primary',
          displayOrder: 0,
          instructor: instructor('ins-1'),
        },
        {
          id: 'row-2',
          role: 'co_instructor',
          displayOrder: 1,
          instructor: instructor('ins-2'),
        },
      ]);

      // An explicit empty list clears the co-instructors; omitting the key
      // would instead leave the current ones in place (see the test below).
      await service.assign('course-1', {
        primaryInstructorId: 'ins-1',
        coInstructorIds: [],
      });

      expect(courseInstructorsService.remove).toHaveBeenCalledWith('row-2');
      expect(courseInstructorsService.remove).toHaveBeenCalledTimes(1);
    });

    it('should keep the current co-instructors when only the primary is sent', async () => {
      courseInstructorsService.findByCourseId.mockResolvedValue([
        {
          id: 'row-1',
          role: 'primary',
          displayOrder: 0,
          instructor: instructor('ins-1'),
        },
        {
          id: 'row-2',
          role: 'co_instructor',
          displayOrder: 1,
          instructor: instructor('ins-2'),
        },
      ]);

      await service.assign('course-1', { primaryInstructorId: 'ins-1' });

      expect(courseInstructorsService.remove).not.toHaveBeenCalled();
    });

    it('should promote an existing co-instructor to primary in place', async () => {
      courseInstructorsService.findByCourseId.mockResolvedValue([
        {
          id: 'row-1',
          role: 'primary',
          displayOrder: 0,
          instructor: instructor('ins-1'),
        },
        {
          id: 'row-2',
          role: 'co_instructor',
          displayOrder: 1,
          instructor: instructor('ins-2'),
        },
      ]);

      await service.assign('course-1', {
        primaryInstructorId: 'ins-2',
        coInstructorIds: ['ins-1'],
      });

      // The old primary row is demoted before the new one is promoted, so the
      // "one primary per course" partial unique index is never violated.
      const updateOrder = courseInstructorsService.update.mock.calls.map(
        (call: any[]) => [call[0], call[1].role],
      );
      expect(updateOrder).toEqual([
        ['row-1', 'co_instructor'],
        ['row-2', 'primary'],
      ]);
      expect(courseInstructorsService.remove).not.toHaveBeenCalled();
      expect(courseInstructorsService.create).not.toHaveBeenCalled();
    });

    it('should keep the current primary when only co-instructors are being edited', async () => {
      courseInstructorsService.findByCourseId.mockResolvedValue([
        {
          id: 'row-1',
          role: 'primary',
          displayOrder: 0,
          instructor: instructor('ins-1'),
        },
      ]);

      await service.assign('course-1', { coInstructorIds: ['ins-2'] });

      expect(courseInstructorsService.remove).not.toHaveBeenCalled();
      expect(courseInstructorsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          instructor: instructor('ins-2'),
          role: 'co_instructor',
        }),
      );
    });

    it('should recompute the counters of every added and removed instructor', async () => {
      courseInstructorsService.findByCourseId.mockResolvedValue([
        {
          id: 'row-1',
          role: 'primary',
          displayOrder: 0,
          instructor: instructor('ins-old'),
        },
      ]);

      await service.assign('course-1', { primaryInstructorId: 'ins-new' });

      expect(instructorStatsService.recomputeMany).toHaveBeenCalledWith(
        expect.arrayContaining(['ins-old', 'ins-new']),
      );
    });

    it('should do nothing when neither key is present', async () => {
      await service.assign('course-1', {});

      expect(courseInstructorsService.create).not.toHaveBeenCalled();
      expect(courseInstructorsService.remove).not.toHaveBeenCalled();
      expect(courseInstructorsService.update).not.toHaveBeenCalled();
    });

    it('should ignore duplicate ids inside coInstructorIds', async () => {
      await service.assign('course-1', {
        primaryInstructorId: 'ins-1',
        coInstructorIds: ['ins-2', 'ins-2'],
      });

      expect(courseInstructorsService.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('findByCourse / findByCourses', () => {
    it('should delegate the read projections to the course-instructors module', async () => {
      courseInstructorsService.findViewByCourseId.mockResolvedValue({
        primaryInstructor: null,
        coInstructors: [],
      });
      courseInstructorsService.findViewByCourseIds.mockResolvedValue(new Map());

      await service.findByCourse('course-1');
      await service.findByCourses(['course-1']);

      expect(courseInstructorsService.findViewByCourseId).toHaveBeenCalledWith(
        'course-1',
      );
      expect(courseInstructorsService.findViewByCourseIds).toHaveBeenCalledWith(
        ['course-1'],
      );
    });
  });
});
