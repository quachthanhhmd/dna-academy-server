import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CoursesAdminService } from './courses-admin.service';

describe('CoursesAdminService', () => {
  let service: CoursesAdminService;

  let coursesService: {
    create: jest.Mock<any>;
    update: jest.Mock<any>;
    findById: jest.Mock<any>;
    findBySlug: jest.Mock<any>;
    findByCourseId: jest.Mock<any>;
    findAllWithPagination: jest.Mock<any>;
  };
  let masterDataCodesService: { findById: jest.Mock<any> };
  let courseInstructorsAdminService: {
    assign: jest.Mock<any>;
    validateAssignable: jest.Mock<any>;
  };
  let youtubeService: { validateAndExtractVideoId: jest.Mock<any> };

  const levelCode = {
    id: 'level-1',
    isActive: true,
    group: { groupKey: 'course_level' },
  };
  const categoryCode = {
    id: 'category-1',
    isActive: true,
    group: { groupKey: 'course_category' },
  };

  beforeEach(() => {
    coursesService = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByCourseId: jest.fn(),
      findAllWithPagination: jest.fn(),
    };
    masterDataCodesService = { findById: jest.fn() };
    courseInstructorsAdminService = {
      assign: jest.fn(),
      validateAssignable: jest.fn(),
    };
    courseInstructorsAdminService.assign.mockResolvedValue({
      primaryInstructor: null,
      coInstructors: [],
    });
    courseInstructorsAdminService.validateAssignable.mockResolvedValue(
      undefined,
    );
    youtubeService = { validateAndExtractVideoId: jest.fn() };

    // No course claims the incoming courseId unless a test says otherwise.
    coursesService.findByCourseId.mockResolvedValue(null);

    service = new CoursesAdminService(
      coursesService as any,
      masterDataCodesService as any,
      youtubeService as any,
      courseInstructorsAdminService as any,
    );
  });

  describe('create', () => {
    const baseDto = {
      courseId: 'DNA-101',
      title: 'Intro to TypeScript',
      language: 'en',
      price: 0,
      hasCertificate: false,
      enrollmentOpen: true,
    };

    it('should slugify the title, default status to draft, and derive isFree from price', async () => {
      coursesService.findBySlug.mockResolvedValue(null);
      coursesService.create.mockResolvedValue({ id: 'course-1' });

      await service.create(baseDto as any, 7);

      expect(coursesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'intro-to-typescript',
          status: 'draft',
          isFree: true,
          title: 'Intro to TypeScript',
          createdBy: { id: 7 },
        }),
      );
    });

    it('should carry requiresSequentialCompletion through to the course', async () => {
      coursesService.findBySlug.mockResolvedValue(null);
      coursesService.create.mockResolvedValue({ id: 'course-1' });

      await service.create(
        { ...baseDto, requiresSequentialCompletion: true } as any,
        7,
      );

      expect(coursesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ requiresSequentialCompletion: true }),
      );
    });

    it('should default requiresSequentialCompletion to false', async () => {
      coursesService.findBySlug.mockResolvedValue(null);
      coursesService.create.mockResolvedValue({ id: 'course-1' });

      await service.create(baseDto as any, 7);

      expect(coursesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ requiresSequentialCompletion: false }),
      );
    });

    it('should default the not-null aggregate columns to 0 (totalSections/totalLectures/totalDurationSecs/totalEnrollments)', async () => {
      coursesService.findBySlug.mockResolvedValue(null);
      coursesService.create.mockResolvedValue({ id: 'course-1' });

      await service.create(baseDto as any, 7);

      expect(coursesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalSections: 0,
          totalLectures: 0,
          totalDurationSecs: 0,
          totalEnrollments: 0,
        }),
      );
    });

    it('should derive isFree=false when price > 0', async () => {
      coursesService.findBySlug.mockResolvedValue(null);
      coursesService.create.mockResolvedValue({ id: 'course-1' });

      await service.create({ ...baseDto, price: 49 } as any, 7);

      expect(coursesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ isFree: false }),
      );
    });

    it('should append -2 when the base slug already exists, and stop once a free slug is found', async () => {
      coursesService.findBySlug.mockImplementation((slug: string) =>
        Promise.resolve(
          slug === 'intro-to-typescript' || slug === 'intro-to-typescript-2'
            ? { id: 'existing' }
            : null,
        ),
      );
      coursesService.create.mockResolvedValue({ id: 'course-1' });

      await service.create(baseDto as any, 7);

      expect(coursesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'intro-to-typescript-3' }),
      );
    });

    it('should pass the courseId through to the created course', async () => {
      coursesService.findBySlug.mockResolvedValue(null);
      coursesService.create.mockResolvedValue({ id: 'course-1' });

      await service.create(baseDto as any, 7);

      expect(coursesService.findByCourseId).toHaveBeenCalledWith('DNA-101');
      expect(coursesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ courseId: 'DNA-101' }),
      );
    });

    it('should reject a courseId already taken by another course', async () => {
      coursesService.findByCourseId.mockResolvedValue({ id: 'existing' });

      await expect(service.create(baseDto as any, 7)).rejects.toMatchObject({
        response: { errors: { courseId: 'alreadyExists' } },
      });
      expect(coursesService.create).not.toHaveBeenCalled();
    });

    it('should reject a duplicate courseId before spending a YouTube oEmbed call', async () => {
      coursesService.findByCourseId.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(
          { ...baseDto, introVideoUrl: 'https://youtu.be/abc123' } as any,
          7,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(youtubeService.validateAndExtractVideoId).not.toHaveBeenCalled();
    });

    it('should reject a levelId that is not an active course_level code', async () => {
      masterDataCodesService.findById.mockResolvedValue({
        ...levelCode,
        group: { groupKey: 'course_category' },
      });

      await expect(
        service.create({ ...baseDto, levelId: 'level-1' } as any, 7),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(coursesService.create).not.toHaveBeenCalled();
    });

    it('should validate the instructor payload before writing the course row', async () => {
      courseInstructorsAdminService.validateAssignable.mockRejectedValue(
        new UnprocessableEntityException(),
      );

      await expect(
        service.create({ ...baseDto, primaryInstructorId: 'ins-1' } as any, 7),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(coursesService.create).not.toHaveBeenCalled();
    });

    it('should assign the primary and co-instructors to the new course', async () => {
      coursesService.findBySlug.mockResolvedValue(null);
      coursesService.create.mockResolvedValue({ id: 'course-1' });

      await service.create(
        {
          ...baseDto,
          primaryInstructorId: 'ins-1',
          coInstructorIds: ['ins-2'],
        } as any,
        7,
      );

      expect(courseInstructorsAdminService.assign).toHaveBeenCalledWith(
        'course-1',
        { primaryInstructorId: 'ins-1', coInstructorIds: ['ins-2'] },
      );
    });

    it('should validate introVideoUrl via YouTube oEmbed before saving', async () => {
      coursesService.findBySlug.mockResolvedValue(null);
      coursesService.create.mockResolvedValue({ id: 'course-1' });
      youtubeService.validateAndExtractVideoId.mockResolvedValue('abc123');

      await service.create(
        { ...baseDto, introVideoUrl: 'https://youtu.be/abc123' } as any,
        7,
      );

      expect(youtubeService.validateAndExtractVideoId).toHaveBeenCalledWith(
        'https://youtu.be/abc123',
      );
      expect(coursesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          introVideoUrl: 'https://youtu.be/abc123',
        }),
      );
    });

    it('should resolve level and category and pass the resolved objects through', async () => {
      coursesService.findBySlug.mockResolvedValue(null);
      coursesService.create.mockResolvedValue({ id: 'course-1' });
      masterDataCodesService.findById.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'level-1'
            ? levelCode
            : id === 'category-1'
              ? categoryCode
              : null,
        ),
      );

      await service.create(
        { ...baseDto, levelId: 'level-1', categoryId: 'category-1' } as any,
        7,
      );

      expect(coursesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ level: levelCode, category: categoryCode }),
      );
    });
  });

  describe('update', () => {
    it('should 404 when the course does not exist', async () => {
      coursesService.findById.mockResolvedValue(null);

      await expect(
        service.update('missing', { title: 'X' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should not clobber fields the client omitted from a partial update', async () => {
      coursesService.findById.mockResolvedValue({
        id: 'course-1',
        title: 'Old title',
        enrollmentOpen: true,
        language: 'en',
      });
      coursesService.update.mockResolvedValue({ id: 'course-1' });

      // Simulate the real NestJS-instantiated DTO, which carries every
      // declared field as an own property (undefined when the client
      // omitted it) rather than only the keys actually sent in the body.
      await service.update('course-1', {
        title: undefined,
        enrollmentOpen: undefined,
        language: undefined,
        levelId: undefined,
        categoryId: undefined,
        primaryInstructorId: undefined,
        coInstructorIds: undefined,
        price: undefined,
        shortDescription: 'Only this changes',
      } as any);

      const payload = coursesService.update.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect('title' in payload).toBe(false);
      expect('enrollmentOpen' in payload).toBe(false);
      expect('language' in payload).toBe(false);
      expect(payload.shortDescription).toBe('Only this changes');
      expect('primaryInstructorId' in payload).toBe(false);
      expect('coInstructorIds' in payload).toBe(false);
    });

    it('should not regenerate the slug even when the title changes', async () => {
      coursesService.findById.mockResolvedValue({
        id: 'course-1',
        title: 'Old title',
        slug: 'old-title',
      });
      coursesService.update.mockResolvedValue({ id: 'course-1' });

      await service.update('course-1', { title: 'New Title' } as any);

      expect(coursesService.update).toHaveBeenCalledWith(
        'course-1',
        expect.not.objectContaining({ slug: expect.anything() }),
      );
    });

    it('should reject a courseId already taken by another course', async () => {
      coursesService.findById.mockResolvedValue({
        id: 'course-1',
        courseId: 'DNA-101',
      });
      coursesService.findByCourseId.mockResolvedValue({ id: 'course-2' });

      await expect(
        service.update('course-1', { courseId: 'DNA-202' } as any),
      ).rejects.toMatchObject({
        response: { errors: { courseId: 'alreadyExists' } },
      });
      expect(coursesService.update).not.toHaveBeenCalled();
    });

    it('should allow re-sending the course its own unchanged courseId', async () => {
      coursesService.findById.mockResolvedValue({
        id: 'course-1',
        courseId: 'DNA-101',
      });
      coursesService.findByCourseId.mockResolvedValue({ id: 'course-1' });
      coursesService.update.mockResolvedValue({ id: 'course-1' });

      await service.update('course-1', { courseId: 'DNA-101' } as any);

      expect(coursesService.findByCourseId).not.toHaveBeenCalled();
      expect(coursesService.update).toHaveBeenCalledWith(
        'course-1',
        expect.objectContaining({ courseId: 'DNA-101' }),
      );
    });

    it('should re-validate introVideoUrl via oEmbed when it changes', async () => {
      coursesService.findById.mockResolvedValue({
        id: 'course-1',
        introVideoUrl: null,
      });
      coursesService.update.mockResolvedValue({ id: 'course-1' });
      youtubeService.validateAndExtractVideoId.mockResolvedValue('xyz789');

      await service.update('course-1', {
        introVideoUrl: 'https://youtu.be/xyz789',
      } as any);

      expect(youtubeService.validateAndExtractVideoId).toHaveBeenCalledWith(
        'https://youtu.be/xyz789',
      );
    });
  });
});
