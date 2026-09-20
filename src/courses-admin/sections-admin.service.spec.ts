import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SectionsAdminService } from './sections-admin.service';

describe('SectionsAdminService', () => {
  let service: SectionsAdminService;
  let lecturesAdminService: { deleteLecturesOfSection: jest.Mock<any> };

  let coursesService: { findById: jest.Mock<any> };
  let sectionsService: {
    create: jest.Mock<any>;
    findById: jest.Mock<any>;
    findByCourseId: jest.Mock<any>;
    update: jest.Mock<any>;
    remove: jest.Mock<any>;
  };
  let lecturesService: {
    countBySectionId: jest.Mock<any>;
    removeBySectionId: jest.Mock<any>;
  };
  let courseAggregatesService: { recalculate: jest.Mock<any> };

  beforeEach(() => {
    lecturesAdminService = { deleteLecturesOfSection: jest.fn() };
    coursesService = { findById: jest.fn() };
    sectionsService = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCourseId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    lecturesService = {
      countBySectionId: jest.fn(),
      removeBySectionId: jest.fn(),
    };
    courseAggregatesService = { recalculate: jest.fn() };

    service = new SectionsAdminService(
      coursesService as any,
      sectionsService as any,
      lecturesService as any,
      courseAggregatesService as any,
      lecturesAdminService as any,
    );
  });

  describe('create', () => {
    it('should 404 when the course does not exist', async () => {
      coursesService.findById.mockResolvedValue(null);

      await expect(
        service.create('missing', { title: 'X', displayOrder: 1 } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should create the section and recalculate course aggregates', async () => {
      coursesService.findById.mockResolvedValue({ id: 'course-1' });
      sectionsService.create.mockResolvedValue({ id: 'section-1' });

      await service.create('course-1', {
        title: 'Section 1',
        displayOrder: 1,
      } as any);

      expect(sectionsService.create).toHaveBeenCalledWith({
        course: { id: 'course-1' },
        title: 'Section 1',
        description: undefined,
        learningObjective: undefined,
        displayOrder: 1,
      });
      expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
        'course-1',
      );
    });
  });

  describe('update', () => {
    it('should 404 when the section belongs to a different course', async () => {
      coursesService.findById.mockResolvedValue({ id: 'course-1' });
      sectionsService.findById.mockResolvedValue({
        id: 'section-1',
        course: { id: 'other-course' },
      });

      await expect(
        service.update('course-1', 'section-1', { title: 'X' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should update the section', async () => {
      coursesService.findById.mockResolvedValue({ id: 'course-1' });
      sectionsService.findById.mockResolvedValue({
        id: 'section-1',
        course: { id: 'course-1' },
      });
      sectionsService.update.mockResolvedValue({ id: 'section-1' });

      await service.update('course-1', 'section-1', {
        title: 'Renamed',
      } as any);

      expect(sectionsService.update).toHaveBeenCalledWith('section-1', {
        title: 'Renamed',
      });
    });
  });

  describe('remove', () => {
    it('should 404 when the section belongs to a different course', async () => {
      coursesService.findById.mockResolvedValue({ id: 'course-1' });
      sectionsService.findById.mockResolvedValue({
        id: 'section-1',
        course: { id: 'other-course' },
      });

      await expect(
        service.remove('course-1', 'section-1', false),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should 409 SECTION_HAS_LECTURES when the section has lectures and force is not set', async () => {
      coursesService.findById.mockResolvedValue({ id: 'course-1' });
      sectionsService.findById.mockResolvedValue({
        id: 'section-1',
        course: { id: 'course-1' },
      });
      lecturesService.countBySectionId.mockResolvedValue(2);

      await expect(
        service.remove('course-1', 'section-1', false),
      ).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({ code: 'SECTION_HAS_LECTURES' }),
      });
      expect(sectionsService.remove).not.toHaveBeenCalled();
    });

    it('should cascade-delete lectures when force=true, then delete the section', async () => {
      coursesService.findById.mockResolvedValue({ id: 'course-1' });
      sectionsService.findById.mockResolvedValue({
        id: 'section-1',
        course: { id: 'course-1' },
      });
      lecturesService.countBySectionId.mockResolvedValue(2);

      await service.remove('course-1', 'section-1', true);

      // Through the lecture delete path, so content rows go with them —
      // a bulk delete of the lectures alone is a foreign-key violation.
      expect(lecturesAdminService.deleteLecturesOfSection).toHaveBeenCalledWith(
        'section-1',
      );
      expect(sectionsService.remove).toHaveBeenCalledWith('section-1');
      expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
        'course-1',
      );
    });

    it('should delete a section with no lectures without requiring force', async () => {
      coursesService.findById.mockResolvedValue({ id: 'course-1' });
      sectionsService.findById.mockResolvedValue({
        id: 'section-1',
        course: { id: 'course-1' },
      });
      lecturesService.countBySectionId.mockResolvedValue(0);

      await service.remove('course-1', 'section-1', false);

      expect(lecturesService.removeBySectionId).not.toHaveBeenCalled();
      expect(sectionsService.remove).toHaveBeenCalledWith('section-1');
    });
  });

  describe('reorder', () => {
    it('should 404 when the course does not exist', async () => {
      coursesService.findById.mockResolvedValue(null);

      await expect(
        service.reorder('missing', ['section-1']),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should 422 when orderedIds does not exactly match the course sections', async () => {
      coursesService.findById.mockResolvedValue({ id: 'course-1' });
      sectionsService.findByCourseId.mockResolvedValue([
        { id: 'section-1' },
        { id: 'section-2' },
      ]);

      await expect(
        service.reorder('course-1', ['section-1']),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(sectionsService.update).not.toHaveBeenCalled();
    });

    it('should set displayOrder for each section by array position and recalculate aggregates', async () => {
      coursesService.findById.mockResolvedValue({ id: 'course-1' });
      sectionsService.findByCourseId.mockResolvedValue([
        { id: 'section-1' },
        { id: 'section-2' },
      ]);

      await service.reorder('course-1', ['section-2', 'section-1']);

      expect(sectionsService.update).toHaveBeenNthCalledWith(1, 'section-2', {
        displayOrder: 1,
      });
      expect(sectionsService.update).toHaveBeenNthCalledWith(2, 'section-1', {
        displayOrder: 2,
      });
      expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
        'course-1',
      );
    });
  });
});
