import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UnprocessableEntityException } from '@nestjs/common';
import { CoursePublishAdminService } from './course-publish-admin.service';

describe('CoursePublishAdminService', () => {
  let service: CoursePublishAdminService;

  let coursesService: {
    findById: jest.Mock<any>;
    update: jest.Mock<any>;
  };
  let sectionsService: { findByCourseId: jest.Mock<any> };
  let lecturesService: { findBySectionId: jest.Mock<any> };
  let lectureContentVideosService: { findByLectureId: jest.Mock<any> };
  let lectureContentArticlesService: { findByLectureId: jest.Mock<any> };
  let lectureContentDocumentsService: { findByLectureId: jest.Mock<any> };
  let lectureContentQuizzesService: { findByLectureId: jest.Mock<any> };
  let lectureContentReflectionsService: { findByLectureId: jest.Mock<any> };
  let courseInstructorsService: { findViewByCourseId: jest.Mock<any> };

  const completeCourse = {
    id: 'course-1',
    title: 'Course',
    shortDescription: 'Short',
    thumbnailUrl: 'https://example.com/thumb.png',
    level: { id: 'level-1' },
    category: { id: 'category-1' },
    status: 'draft',
  };

  const section = { id: 'section-1' };
  const videoLecture = { id: 'lecture-1', lectureType: 'video' };

  beforeEach(() => {
    coursesService = {
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue(completeCourse),
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue(undefined),
    };
    sectionsService = {
      findByCourseId: (jest.fn() as jest.Mock<any>).mockResolvedValue([
        section,
      ]),
    };
    lecturesService = {
      findBySectionId: (jest.fn() as jest.Mock<any>).mockResolvedValue([
        videoLecture,
      ]),
    };
    lectureContentVideosService = {
      findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        id: 'content-1',
      }),
    };
    lectureContentArticlesService = {
      findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
    };
    lectureContentDocumentsService = {
      findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
    };
    lectureContentQuizzesService = {
      findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
    };
    lectureContentReflectionsService = {
      findByLectureId: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
    };
    courseInstructorsService = {
      findViewByCourseId: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        primaryInstructor: { id: 'ins-1' },
        coInstructors: [],
      }),
    };

    service = new CoursePublishAdminService(
      coursesService as any,
      sectionsService as any,
      lecturesService as any,
      lectureContentVideosService as any,
      lectureContentArticlesService as any,
      lectureContentDocumentsService as any,
      lectureContentQuizzesService as any,
      lectureContentReflectionsService as any,
      courseInstructorsService as any,
      { findByLectureId: jest.fn() } as any,
    );
  });

  describe('publish', () => {
    it('should publish a course that satisfies the full checklist', async () => {
      await service.publish('course-1', 42);

      expect(coursesService.update).toHaveBeenCalledWith('course-1', {
        status: 'published',
        publishedAt: expect.any(Date),
        publishedBy: { id: 42 },
        // Publishing ends "coming soon", so a later unpublish cannot
        // quietly put the course back in the catalog.
        comingSoon: false,
      });
    });

    it('should reject with missingItems=primaryInstructor when none is assigned', async () => {
      courseInstructorsService.findViewByCourseId.mockResolvedValue({
        primaryInstructor: null,
        coInstructors: [],
      });

      await expect(service.publish('course-1', 42)).rejects.toMatchObject({
        response: { missingItems: ['primaryInstructor'] },
      });
      expect(coursesService.update).not.toHaveBeenCalled();
    });

    it('should throw 404 when the course does not exist', async () => {
      coursesService.findById.mockResolvedValue(null);

      await expect(service.publish('missing', 42)).rejects.toMatchObject({
        status: 404,
      });
    });

    it('should reject with missingItems when title/shortDescription/thumbnailUrl are absent', async () => {
      coursesService.findById.mockResolvedValue({
        ...completeCourse,
        title: '',
        shortDescription: null,
        thumbnailUrl: null,
      });

      await expect(service.publish('course-1', 42)).rejects.toMatchObject({
        response: {
          status: 422,
          missingItems: expect.arrayContaining([
            'title',
            'shortDescription',
            'thumbnailUrl',
          ]),
        },
      });
      expect(coursesService.update).not.toHaveBeenCalled();
    });

    it('should reject with missingItems when levelId/categoryId are unset', async () => {
      coursesService.findById.mockResolvedValue({
        ...completeCourse,
        level: null,
        category: null,
      });

      await expect(service.publish('course-1', 42)).rejects.toMatchObject({
        response: {
          missingItems: expect.arrayContaining(['levelId', 'categoryId']),
        },
      });
    });

    it('should reject with missingItems=curriculum when there are no sections', async () => {
      sectionsService.findByCourseId.mockResolvedValue([]);

      await expect(service.publish('course-1', 42)).rejects.toMatchObject({
        response: { missingItems: ['curriculum'] },
      });
    });

    it('should reject with missingItems=curriculum when sections have no lectures', async () => {
      lecturesService.findBySectionId.mockResolvedValue([]);

      await expect(service.publish('course-1', 42)).rejects.toMatchObject({
        response: { missingItems: ['curriculum'] },
      });
    });

    it('should reject with missingItems=lectureContent when a lecture has no saved content', async () => {
      lectureContentVideosService.findByLectureId.mockResolvedValue(null);

      await expect(service.publish('course-1', 42)).rejects.toMatchObject({
        response: { missingItems: ['lectureContent'] },
      });
    });
  });

  describe('setComingSoon', () => {
    it('should mark an unpublished course as coming soon', async () => {
      coursesService.findById.mockResolvedValue({
        ...completeCourse,
        status: 'draft',
      });

      await service.setComingSoon('course-1', true);

      expect(coursesService.update).toHaveBeenCalledWith('course-1', {
        comingSoon: true,
      });
    });

    it('should 422 turning it on for a published course, writing nothing', async () => {
      coursesService.findById.mockResolvedValue({
        ...completeCourse,
        status: 'published',
      });

      await expect(
        service.setComingSoon('course-1', true),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(coursesService.update).not.toHaveBeenCalled();
    });

    it('should always allow turning it off', async () => {
      coursesService.findById.mockResolvedValue({
        ...completeCourse,
        status: 'published',
      });

      await service.setComingSoon('course-1', false);

      expect(coursesService.update).toHaveBeenCalledWith('course-1', {
        comingSoon: false,
      });
    });
  });

  describe('unpublish', () => {
    it('should set status=unpublished without touching other fields', async () => {
      await service.unpublish('course-1');

      expect(coursesService.update).toHaveBeenCalledWith('course-1', {
        status: 'unpublished',
      });
    });

    it('should reject with missingItems=primaryInstructor when none is assigned', async () => {
      courseInstructorsService.findViewByCourseId.mockResolvedValue({
        primaryInstructor: null,
        coInstructors: [],
      });

      await expect(service.publish('course-1', 42)).rejects.toMatchObject({
        response: { missingItems: ['primaryInstructor'] },
      });
      expect(coursesService.update).not.toHaveBeenCalled();
    });

    it('should throw 404 when the course does not exist', async () => {
      coursesService.findById.mockResolvedValue(null);

      await expect(service.unpublish('missing')).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
