import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InstructorsAdminService } from './instructors-admin.service';

describe('InstructorsAdminService', () => {
  let service: InstructorsAdminService;

  let instructorsService: {
    create: jest.Mock<any>;
    update: jest.Mock<any>;
    remove: jest.Mock<any>;
    findById: jest.Mock<any>;
    findBySlug: jest.Mock<any>;
    findByUserId: jest.Mock<any>;
    findAllWithPagination: jest.Mock<any>;
  };
  let instructorExpertisesService: {
    create: jest.Mock<any>;
    removeByInstructorId: jest.Mock<any>;
  };
  let instructorSocialLinksService: {
    create: jest.Mock<any>;
    removeByInstructorId: jest.Mock<any>;
  };
  let courseInstructorsService: {
    findByInstructorId: jest.Mock<any>;
    countByInstructorId: jest.Mock<any>;
  };
  let masterDataCodesService: { findById: jest.Mock<any> };
  let usersService: { findById: jest.Mock<any> };
  let instructorStatsService: { recompute: jest.Mock<any> };
  let instructorProfilesService: {
    findExpertise: jest.Mock<any>;
    findSocialLinks: jest.Mock<any>;
  };

  const expertiseCode = {
    id: 'code-1',
    code: 'data_analytics',
    name: 'Data Analytics',
    isActive: true,
    group: { groupKey: 'expertise_area' },
  };

  const savedInstructor = {
    id: 'ins-1',
    slug: 'nguyen-van-a',
    fullName: 'Nguyễn Văn A',
    isActive: true,
    displayOrder: 0,
    totalCourses: 0,
    totalStudents: 0,
    avgRating: null,
    createdAt: new Date('2026-08-29T14:00:00Z'),
    updatedAt: new Date('2026-08-29T14:00:00Z'),
  };

  beforeEach(() => {
    instructorsService = {
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByUserId: jest.fn(),
      findAllWithPagination: jest.fn(),
    };
    instructorExpertisesService = {
      create: jest.fn(),
      removeByInstructorId: jest.fn(),
    };
    instructorSocialLinksService = {
      create: jest.fn(),
      removeByInstructorId: jest.fn(),
    };
    courseInstructorsService = {
      findByInstructorId: jest.fn(),
      countByInstructorId: jest.fn(),
    };
    masterDataCodesService = { findById: jest.fn() };
    usersService = { findById: jest.fn() };
    instructorStatsService = { recompute: jest.fn() };
    instructorProfilesService = {
      findExpertise: jest.fn(),
      findSocialLinks: jest.fn(),
    };

    // Defaults: nothing exists, nothing is linked, no assignments.
    instructorsService.findBySlug.mockResolvedValue(null);
    instructorsService.findByUserId.mockResolvedValue(null);
    instructorsService.create.mockResolvedValue(savedInstructor);
    instructorsService.update.mockResolvedValue(savedInstructor);
    instructorsService.findById.mockResolvedValue(savedInstructor);
    instructorProfilesService.findExpertise.mockResolvedValue([]);
    instructorProfilesService.findSocialLinks.mockResolvedValue([]);
    courseInstructorsService.findByInstructorId.mockResolvedValue([]);
    courseInstructorsService.countByInstructorId.mockResolvedValue(0);
    instructorStatsService.recompute.mockResolvedValue({
      totalCourses: 0,
      totalStudents: 0,
      avgRating: null,
    });

    service = new InstructorsAdminService(
      instructorsService as any,
      instructorExpertisesService as any,
      instructorSocialLinksService as any,
      courseInstructorsService as any,
      masterDataCodesService as any,
      usersService as any,
      instructorStatsService as any,
      instructorProfilesService as any,
    );
  });

  describe('create', () => {
    const baseDto = { fullName: 'Nguyễn Văn A' };

    it('should ASCII-fold the Vietnamese full name into the generated slug', async () => {
      await service.create(baseDto as any, 7);

      expect(instructorsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'nguyen-van-a' }),
      );
    });

    it('should default isActive to true and the denormalized counters to 0', async () => {
      await service.create(baseDto as any, 7);

      expect(instructorsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          displayOrder: 0,
          totalCourses: 0,
          totalStudents: 0,
          avgRating: null,
          createdBy: { id: 7 },
        }),
      );
    });

    it('should suffix the slug until a free one is found', async () => {
      instructorsService.findBySlug.mockImplementation((slug: string) =>
        Promise.resolve(
          slug === 'nguyen-van-a' || slug === 'nguyen-van-a-2'
            ? { id: 'other' }
            : null,
        ),
      );

      await service.create(baseDto as any, 7);

      expect(instructorsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'nguyen-van-a-3' }),
      );
    });

    it('should honour an explicitly supplied slug', async () => {
      await service.create({ ...baseDto, slug: 'teacher-a' } as any, 7);

      expect(instructorsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'teacher-a' }),
      );
    });

    it('should persist one expertise row per validated code id', async () => {
      masterDataCodesService.findById.mockResolvedValue(expertiseCode);

      await service.create(
        { ...baseDto, expertiseCodeIds: ['code-1'] } as any,
        7,
      );

      expect(instructorExpertisesService.create).toHaveBeenCalledWith({
        instructor: { id: 'ins-1' },
        expertiseCode,
      });
    });

    it('should reject an expertise code from another master data group', async () => {
      masterDataCodesService.findById.mockResolvedValue({
        ...expertiseCode,
        group: { groupKey: 'course_category' },
      });

      await expect(
        service.create({ ...baseDto, expertiseCodeIds: ['code-1'] } as any, 7),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(instructorsService.create).not.toHaveBeenCalled();
    });

    it('should reject an inactive expertise code', async () => {
      masterDataCodesService.findById.mockResolvedValue({
        ...expertiseCode,
        isActive: false,
      });

      await expect(
        service.create({ ...baseDto, expertiseCodeIds: ['code-1'] } as any, 7),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should persist social links with a defaulted display order', async () => {
      await service.create(
        {
          ...baseDto,
          socialLinks: [
            { platform: 'linkedin', url: 'https://linkedin.com/in/a' },
          ],
        } as any,
        7,
      );

      expect(instructorSocialLinksService.create).toHaveBeenCalledWith({
        instructor: { id: 'ins-1' },
        platform: 'linkedin',
        url: 'https://linkedin.com/in/a',
        displayOrder: 0,
      });
    });

    it('should reject linking a user that does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.create({ ...baseDto, userId: 42 } as any, 7),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should reject linking a user already claimed by another instructor', async () => {
      usersService.findById.mockResolvedValue({ id: 42 });
      instructorsService.findByUserId.mockResolvedValue({ id: 'ins-other' });

      await expect(
        service.create({ ...baseDto, userId: 42 } as any, 7),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return the profile with expertise, social links and stats', async () => {
      instructorProfilesService.findExpertise.mockResolvedValue([
        { id: 'code-1', code: 'data_analytics', name: 'Data Analytics' },
      ]);
      instructorProfilesService.findSocialLinks.mockResolvedValue([
        { platform: 'linkedin', url: 'https://x', displayOrder: 0 },
      ]);
      instructorStatsService.recompute.mockResolvedValue({
        totalCourses: 3,
        totalStudents: 412,
        avgRating: 4.75,
      });

      const result = await service.findOne('ins-1');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'ins-1',
          slug: 'nguyen-van-a',
          expertise: [
            { id: 'code-1', code: 'data_analytics', name: 'Data Analytics' },
          ],
          socialLinks: [
            { platform: 'linkedin', url: 'https://x', displayOrder: 0 },
          ],
          stats: { totalCourses: 3, totalStudents: 412, avgRating: 4.75 },
        }),
      );
    });

    it('should 404 for an unknown instructor', async () => {
      instructorsService.findById.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should replace the expertise set only when the key is present', async () => {
      masterDataCodesService.findById.mockResolvedValue(expertiseCode);

      await service.update('ins-1', { expertiseCodeIds: ['code-1'] } as any);

      expect(
        instructorExpertisesService.removeByInstructorId,
      ).toHaveBeenCalledWith('ins-1');
      expect(instructorExpertisesService.create).toHaveBeenCalledTimes(1);
    });

    it('should leave expertise untouched when the key is omitted', async () => {
      await service.update('ins-1', { headline: 'New headline' } as any);

      expect(
        instructorExpertisesService.removeByInstructorId,
      ).not.toHaveBeenCalled();
    });

    it('should clear the expertise set when an empty array is sent', async () => {
      await service.update('ins-1', { expertiseCodeIds: [] } as any);

      expect(
        instructorExpertisesService.removeByInstructorId,
      ).toHaveBeenCalledWith('ins-1');
      expect(instructorExpertisesService.create).not.toHaveBeenCalled();
    });

    it('should refuse a slug change once a published course uses the instructor', async () => {
      courseInstructorsService.findByInstructorId.mockResolvedValue([
        { course: { id: 'c1', status: 'published' } },
      ]);

      await expect(
        service.update('ins-1', { slug: 'new-slug' } as any),
      ).rejects.toThrow(ConflictException);
      expect(instructorsService.update).not.toHaveBeenCalled();
    });

    it('should allow a slug change while every assigned course is still draft', async () => {
      courseInstructorsService.findByInstructorId.mockResolvedValue([
        { course: { id: 'c1', status: 'draft' } },
      ]);

      await service.update('ins-1', { slug: 'new-slug' } as any);

      expect(instructorsService.update).toHaveBeenCalledWith(
        'ins-1',
        expect.objectContaining({ slug: 'new-slug' }),
      );
    });

    it('should not treat re-sending the current slug as a slug change', async () => {
      courseInstructorsService.findByInstructorId.mockResolvedValue([
        { course: { id: 'c1', status: 'published' } },
      ]);

      await expect(
        service.update('ins-1', { slug: 'nguyen-van-a' } as any),
      ).resolves.toBeDefined();
    });

    it('should reject a slug already taken by another instructor', async () => {
      instructorsService.findBySlug.mockResolvedValue({ id: 'ins-other' });

      await expect(
        service.update('ins-1', { slug: 'taken' } as any),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('updateStatus', () => {
    it('should deactivate without touching existing course assignments', async () => {
      await service.updateStatus('ins-1', false);

      expect(instructorsService.update).toHaveBeenCalledWith('ins-1', {
        isActive: false,
      });
    });
  });

  describe('linkUser', () => {
    it('should link a free user account', async () => {
      usersService.findById.mockResolvedValue({ id: 42 });

      await service.linkUser('ins-1', 42);

      expect(instructorsService.update).toHaveBeenCalledWith('ins-1', {
        user: { id: 42 },
      });
    });

    it('should 409 when the user is already linked elsewhere', async () => {
      usersService.findById.mockResolvedValue({ id: 42 });
      instructorsService.findByUserId.mockResolvedValue({ id: 'ins-other' });

      await expect(service.linkUser('ins-1', 42)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should accept re-linking the user already linked to this instructor', async () => {
      usersService.findById.mockResolvedValue({ id: 42 });
      instructorsService.findByUserId.mockResolvedValue({ id: 'ins-1' });

      await expect(service.linkUser('ins-1', 42)).resolves.toBeDefined();
    });

    it('should unlink when userId is null', async () => {
      await service.linkUser('ins-1', null);

      expect(instructorsService.update).toHaveBeenCalledWith('ins-1', {
        user: null,
      });
    });
  });

  describe('remove', () => {
    it('should delete an instructor with no assignments and cascade its child rows', async () => {
      await service.remove('ins-1');

      expect(
        instructorExpertisesService.removeByInstructorId,
      ).toHaveBeenCalledWith('ins-1');
      expect(
        instructorSocialLinksService.removeByInstructorId,
      ).toHaveBeenCalledWith('ins-1');
      expect(instructorsService.remove).toHaveBeenCalledWith('ins-1');
    });

    it('should 409 with the assignment count when courses still reference it', async () => {
      courseInstructorsService.countByInstructorId.mockResolvedValue(2);

      await expect(service.remove('ins-1')).rejects.toMatchObject({
        response: expect.objectContaining({
          error: 'has_assigned_courses',
          assignedCoursesCount: 2,
        }),
      });
      expect(instructorsService.remove).not.toHaveBeenCalled();
    });
  });

  describe('findCourses', () => {
    it('should list the courses the instructor is assigned to with their role', async () => {
      courseInstructorsService.findByInstructorId.mockResolvedValue([
        {
          role: 'primary',
          course: {
            id: 'c1',
            title: 'Intro',
            slug: 'intro',
            status: 'published',
            totalEnrollments: 12,
          },
        },
      ]);

      await expect(service.findCourses('ins-1')).resolves.toEqual([
        {
          id: 'c1',
          title: 'Intro',
          slug: 'intro',
          status: 'published',
          role: 'primary',
          totalEnrollments: 12,
        },
      ]);
    });
  });
});
