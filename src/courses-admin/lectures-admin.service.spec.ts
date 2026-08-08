import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LecturesAdminService } from './lectures-admin.service';

describe('LecturesAdminService', () => {
  let service: LecturesAdminService;

  let coursesService: { findById: jest.Mock<any> };
  let sectionsService: { findById: jest.Mock<any> };
  let lecturesService: {
    create: jest.Mock<any>;
    findById: jest.Mock<any>;
    findBySectionId: jest.Mock<any>;
    update: jest.Mock<any>;
    remove: jest.Mock<any>;
  };
  let courseAggregatesService: { recalculate: jest.Mock<any> };

  const course = { id: 'course-1' };
  const section = { id: 'section-1', course: { id: 'course-1' } };

  beforeEach(() => {
    coursesService = { findById: jest.fn() };
    sectionsService = { findById: jest.fn() };
    lecturesService = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySectionId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    courseAggregatesService = { recalculate: jest.fn() };

    service = new LecturesAdminService(
      coursesService as any,
      sectionsService as any,
      lecturesService as any,
      courseAggregatesService as any,
    );
  });

  describe('create', () => {
    it('should 404 when the section does not belong to the course', async () => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue({
        id: 'section-1',
        course: { id: 'other-course' },
      });

      await expect(
        service.create('course-1', 'section-1', {
          title: 'X',
          lectureType: 'article',
          durationSecs: 10,
          isPreview: false,
          requiresCompletion: true,
          displayOrder: 1,
        } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should create the lecture under the section and recalculate aggregates', async () => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue(section);
      lecturesService.create.mockResolvedValue({ id: 'lecture-1' });

      await service.create('course-1', 'section-1', {
        title: 'Lecture 1',
        lectureType: 'article',
        durationSecs: 90,
        isPreview: false,
        requiresCompletion: true,
        displayOrder: 1,
      } as any);

      expect(lecturesService.create).toHaveBeenCalledWith({
        section: { id: 'section-1' },
        title: 'Lecture 1',
        description: undefined,
        lectureType: 'article',
        durationSecs: 90,
        isPreview: false,
        requiresCompletion: true,
        displayOrder: 1,
        status: 'draft',
      });
      expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
        'course-1',
      );
    });
  });

  describe('update', () => {
    it('should 404 when the lecture does not belong to the section/course', async () => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue(section);
      lecturesService.findById.mockResolvedValue({
        id: 'lecture-1',
        section: { id: 'other-section' },
      });

      await expect(
        service.update('course-1', 'section-1', 'lecture-1', {
          title: 'X',
        } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should update the lecture and recalculate aggregates', async () => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue(section);
      lecturesService.findById.mockResolvedValue({
        id: 'lecture-1',
        section: { id: 'section-1' },
      });
      lecturesService.update.mockResolvedValue({ id: 'lecture-1' });

      await service.update('course-1', 'section-1', 'lecture-1', {
        durationSecs: 200,
      } as any);

      expect(lecturesService.update).toHaveBeenCalledWith('lecture-1', {
        durationSecs: 200,
      });
      expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
        'course-1',
      );
    });
  });

  describe('remove', () => {
    it('should delete the lecture and recalculate aggregates', async () => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue(section);
      lecturesService.findById.mockResolvedValue({
        id: 'lecture-1',
        section: { id: 'section-1' },
      });

      await service.remove('course-1', 'section-1', 'lecture-1');

      expect(lecturesService.remove).toHaveBeenCalledWith('lecture-1');
      expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
        'course-1',
      );
    });
  });

  describe('reorder', () => {
    it('should 422 when orderedIds does not exactly match the section lectures', async () => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue(section);
      lecturesService.findBySectionId.mockResolvedValue([
        { id: 'lecture-1' },
        { id: 'lecture-2' },
      ]);

      await expect(
        service.reorder('course-1', 'section-1', ['lecture-1']),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should set displayOrder by array position and recalculate aggregates', async () => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue(section);
      lecturesService.findBySectionId.mockResolvedValue([
        { id: 'lecture-1' },
        { id: 'lecture-2' },
      ]);

      await service.reorder('course-1', 'section-1', [
        'lecture-2',
        'lecture-1',
      ]);

      expect(lecturesService.update).toHaveBeenNthCalledWith(1, 'lecture-2', {
        displayOrder: 1,
      });
      expect(lecturesService.update).toHaveBeenNthCalledWith(2, 'lecture-1', {
        displayOrder: 2,
      });
      expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
        'course-1',
      );
    });
  });

  describe('move', () => {
    it('should 404 when the lecture does not belong to the course', async () => {
      coursesService.findById.mockResolvedValue(course);
      lecturesService.findById.mockResolvedValue({
        id: 'lecture-1',
        section: { id: 'section-1', course: { id: 'other-course' } },
      });

      await expect(
        service.move('course-1', 'lecture-1', 'section-2', 1),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should 422 when the target section does not belong to the course', async () => {
      coursesService.findById.mockResolvedValue(course);
      lecturesService.findById.mockResolvedValue({
        id: 'lecture-1',
        section: { id: 'section-1', course: { id: 'course-1' } },
      });
      sectionsService.findById.mockResolvedValue({
        id: 'section-2',
        course: { id: 'other-course' },
      });

      await expect(
        service.move('course-1', 'lecture-1', 'section-2', 1),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should move the lecture to the target section with the given displayOrder', async () => {
      coursesService.findById.mockResolvedValue(course);
      lecturesService.findById.mockResolvedValue({
        id: 'lecture-1',
        section: { id: 'section-1', course: { id: 'course-1' } },
      });
      sectionsService.findById.mockResolvedValue({
        id: 'section-2',
        course: { id: 'course-1' },
      });
      lecturesService.update.mockResolvedValue({ id: 'lecture-1' });

      await service.move('course-1', 'lecture-1', 'section-2', 3);

      expect(lecturesService.update).toHaveBeenCalledWith('lecture-1', {
        section: { id: 'section-2' },
        displayOrder: 3,
      });
      expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
        'course-1',
      );
    });
  });
});
