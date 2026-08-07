import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { CourseListsAdminService } from './course-lists-admin.service';

describe('CourseListsAdminService', () => {
  let service: CourseListsAdminService;

  let coursesService: { findById: jest.Mock<any> };
  let courseLearningOutcomesService: {
    findByCourseId: jest.Mock<any>;
    removeByCourseId: jest.Mock<any>;
    create: jest.Mock<any>;
  };
  let courseRequirementsService: {
    findByCourseId: jest.Mock<any>;
    removeByCourseId: jest.Mock<any>;
    create: jest.Mock<any>;
  };
  let courseTargetLearnersService: {
    findByCourseId: jest.Mock<any>;
    removeByCourseId: jest.Mock<any>;
    create: jest.Mock<any>;
  };

  beforeEach(() => {
    coursesService = { findById: jest.fn() };
    courseLearningOutcomesService = {
      findByCourseId: jest.fn(),
      removeByCourseId: jest.fn(),
      create: jest.fn(),
    };
    courseRequirementsService = {
      findByCourseId: jest.fn(),
      removeByCourseId: jest.fn(),
      create: jest.fn(),
    };
    courseTargetLearnersService = {
      findByCourseId: jest.fn(),
      removeByCourseId: jest.fn(),
      create: jest.fn(),
    };

    service = new CourseListsAdminService(
      coursesService as any,
      courseLearningOutcomesService as any,
      courseRequirementsService as any,
      courseTargetLearnersService as any,
    );
  });

  describe('replaceOutcomes', () => {
    it('should 404 when the course does not exist', async () => {
      coursesService.findById.mockResolvedValue(null);

      await expect(
        service.replaceOutcomes('missing', [
          { description: 'x', displayOrder: 1 },
        ]),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(
        courseLearningOutcomesService.removeByCourseId,
      ).not.toHaveBeenCalled();
    });

    it('should remove the existing list then create each new item in order', async () => {
      coursesService.findById.mockResolvedValue({ id: 'course-1' });
      courseLearningOutcomesService.create
        .mockResolvedValueOnce({ id: 'o-1', description: 'A', displayOrder: 1 })
        .mockResolvedValueOnce({
          id: 'o-2',
          description: 'B',
          displayOrder: 2,
        });

      const result = await service.replaceOutcomes('course-1', [
        { description: 'A', displayOrder: 1 },
        { description: 'B', displayOrder: 2 },
      ]);

      expect(
        courseLearningOutcomesService.removeByCourseId,
      ).toHaveBeenCalledWith('course-1');
      expect(courseLearningOutcomesService.create).toHaveBeenNthCalledWith(1, {
        course: { id: 'course-1' },
        description: 'A',
        displayOrder: 1,
      });
      expect(courseLearningOutcomesService.create).toHaveBeenNthCalledWith(2, {
        course: { id: 'course-1' },
        description: 'B',
        displayOrder: 2,
      });
      expect(result).toEqual([
        { id: 'o-1', description: 'A', displayOrder: 1 },
        { id: 'o-2', description: 'B', displayOrder: 2 },
      ]);
    });

    it('should replace with an empty list when given no items', async () => {
      coursesService.findById.mockResolvedValue({ id: 'course-1' });

      const result = await service.replaceOutcomes('course-1', []);

      expect(
        courseLearningOutcomesService.removeByCourseId,
      ).toHaveBeenCalledWith('course-1');
      expect(courseLearningOutcomesService.create).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('replaceRequirements', () => {
    it('should delegate to the requirements service', async () => {
      coursesService.findById.mockResolvedValue({ id: 'course-1' });
      courseRequirementsService.create.mockResolvedValue({ id: 'r-1' });

      await service.replaceRequirements('course-1', [
        { description: 'Req 1', displayOrder: 1 },
      ]);

      expect(courseRequirementsService.removeByCourseId).toHaveBeenCalledWith(
        'course-1',
      );
      expect(courseRequirementsService.create).toHaveBeenCalledWith({
        course: { id: 'course-1' },
        description: 'Req 1',
        displayOrder: 1,
      });
    });
  });

  describe('replaceTargetLearners', () => {
    it('should delegate to the target learners service', async () => {
      coursesService.findById.mockResolvedValue({ id: 'course-1' });
      courseTargetLearnersService.create.mockResolvedValue({ id: 't-1' });

      await service.replaceTargetLearners('course-1', [
        { description: 'Learner 1', displayOrder: 1 },
      ]);

      expect(courseTargetLearnersService.removeByCourseId).toHaveBeenCalledWith(
        'course-1',
      );
      expect(courseTargetLearnersService.create).toHaveBeenCalledWith({
        course: { id: 'course-1' },
        description: 'Learner 1',
        displayOrder: 1,
      });
    });
  });
});
