import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { CourseOverviewService } from './course-overview.service';

describe('CourseOverviewService', () => {
  let service: CourseOverviewService;

  let coursesService: { findBySlug: jest.Mock<any> };
  let sectionsService: { findByCourseId: jest.Mock<any> };
  let lecturesService: { findBySectionId: jest.Mock<any> };
  let courseLearningOutcomesService: { findByCourseId: jest.Mock<any> };
  let courseRequirementsService: { findByCourseId: jest.Mock<any> };
  let courseTargetLearnersService: { findByCourseId: jest.Mock<any> };
  let courseGroupAssignmentsService: { findByCourseId: jest.Mock<any> };
  let enrollmentsService: { findByStudentAndCourse: jest.Mock<any> };

  const publishedCourse = {
    id: 'course-1',
    slug: 'career-basics',
    title: 'Career Basics',
    status: 'published',
    enrollmentOpen: true,
    shortDescription: 'Short',
    fullDescription: 'Full',
    thumbnailUrl: 'https://cdn/t.png',
    introVideoUrl: 'https://youtu.be/x',
    instructor: {
      id: 7,
      fullName: 'Jane Doe',
      profilePictureUrl: 'https://cdn/j.png',
    },
    level: { id: 'level-1', name: 'Beginner' },
    category: { id: 'cat-1', name: 'Career' },
    language: 'vi',
    totalDurationSecs: 7200,
    totalSections: 1,
    totalLectures: 2,
    price: 0,
    isFree: true,
    hasCertificate: true,
    avgRating: 4.5,
    totalEnrollments: 12,
  };

  beforeEach(() => {
    coursesService = { findBySlug: jest.fn() };
    sectionsService = { findByCourseId: jest.fn() };
    lecturesService = { findBySectionId: jest.fn() };
    courseLearningOutcomesService = { findByCourseId: jest.fn() };
    courseRequirementsService = { findByCourseId: jest.fn() };
    courseTargetLearnersService = { findByCourseId: jest.fn() };
    courseGroupAssignmentsService = { findByCourseId: jest.fn() };
    enrollmentsService = { findByStudentAndCourse: jest.fn() };

    coursesService.findBySlug.mockResolvedValue(publishedCourse);
    sectionsService.findByCourseId.mockResolvedValue([]);
    lecturesService.findBySectionId.mockResolvedValue([]);
    courseLearningOutcomesService.findByCourseId.mockResolvedValue([]);
    courseRequirementsService.findByCourseId.mockResolvedValue([]);
    courseTargetLearnersService.findByCourseId.mockResolvedValue([]);
    courseGroupAssignmentsService.findByCourseId.mockResolvedValue([]);
    enrollmentsService.findByStudentAndCourse.mockResolvedValue(null);

    service = new CourseOverviewService(
      coursesService as any,
      sectionsService as any,
      lecturesService as any,
      courseLearningOutcomesService as any,
      courseRequirementsService as any,
      courseTargetLearnersService as any,
      courseGroupAssignmentsService as any,
      enrollmentsService as any,
    );
  });

  describe('visibility', () => {
    it('should 404 when the slug does not exist', async () => {
      coursesService.findBySlug.mockResolvedValue(null);

      await expect(
        service.findPublishedBySlug('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each(['draft', 'unpublished', 'inactive'])(
      'should 404 rather than expose a %s course',
      async (status) => {
        coursesService.findBySlug.mockResolvedValue({
          ...publishedCourse,
          status,
        });

        await expect(
          service.findPublishedBySlug('career-basics'),
        ).rejects.toBeInstanceOf(NotFoundException);
      },
    );

    it('should still return a published course whose enrollment is closed', async () => {
      coursesService.findBySlug.mockResolvedValue({
        ...publishedCourse,
        enrollmentOpen: false,
      });

      const result = await service.findPublishedBySlug('career-basics');

      expect(result.id).toBe('course-1');
    });
  });

  describe('curriculum', () => {
    it('should nest lectures under their section, exposing no content URLs', async () => {
      sectionsService.findByCourseId.mockResolvedValue([
        { id: 'section-1', title: 'Section 1', displayOrder: 1 },
      ]);
      lecturesService.findBySectionId.mockResolvedValue([
        {
          id: 'lecture-1',
          title: 'Intro',
          lectureType: 'video',
          durationSecs: 300,
          isPreview: true,
          displayOrder: 1,
          // fields that must not leak into the public payload
          status: 'active',
          requiresCompletion: true,
          section: { id: 'section-1' },
        },
      ]);

      const result = await service.findPublishedBySlug('career-basics');

      expect(result.curriculum).toEqual([
        {
          id: 'section-1',
          title: 'Section 1',
          displayOrder: 1,
          lectures: [
            {
              id: 'lecture-1',
              title: 'Intro',
              lectureType: 'video',
              durationSecs: 300,
              isPreview: true,
              displayOrder: 1,
            },
          ],
        },
      ]);
    });

    it('should list locked (non-preview) lectures with their metadata intact', async () => {
      sectionsService.findByCourseId.mockResolvedValue([
        { id: 'section-1', title: 'Section 1', displayOrder: 1 },
      ]);
      lecturesService.findBySectionId.mockResolvedValue([
        {
          id: 'lecture-2',
          title: 'Locked lesson',
          lectureType: 'article',
          durationSecs: 600,
          isPreview: false,
          displayOrder: 2,
        },
      ]);

      const [section] = (await service.findPublishedBySlug('career-basics'))
        .curriculum;

      expect(section.lectures[0]).toMatchObject({
        title: 'Locked lesson',
        durationSecs: 600,
        isPreview: false,
      });
    });
  });

  describe('supporting lists', () => {
    it('should flatten outcomes, requirements and target learners to strings', async () => {
      courseLearningOutcomesService.findByCourseId.mockResolvedValue([
        { id: 'o-1', description: 'Outcome A', displayOrder: 1 },
      ]);
      courseRequirementsService.findByCourseId.mockResolvedValue([
        { id: 'r-1', description: 'Requirement A', displayOrder: 1 },
      ]);
      courseTargetLearnersService.findByCourseId.mockResolvedValue([
        { id: 't-1', description: 'Learner A', displayOrder: 1 },
      ]);
      courseGroupAssignmentsService.findByCourseId.mockResolvedValue([
        { id: 'a-1', group: { id: 'group-1' } },
      ]);

      const result = await service.findPublishedBySlug('career-basics');

      expect(result.learningOutcomes).toEqual(['Outcome A']);
      expect(result.requirements).toEqual(['Requirement A']);
      expect(result.targetLearners).toEqual(['Learner A']);
      expect(result.groupIds).toEqual(['group-1']);
    });
  });

  describe('enrollment status', () => {
    it('should report not-enrolled for an anonymous caller and skip the lookup', async () => {
      const result = await service.findPublishedBySlug('career-basics');

      expect(result.isEnrolled).toBe(false);
      expect(result.enrollmentStatus).toBeNull();
      expect(result.enrollmentId).toBeNull();
      expect(enrollmentsService.findByStudentAndCourse).not.toHaveBeenCalled();
    });

    it('should report not-enrolled for a signed-in student with no enrollment', async () => {
      const result = await service.findPublishedBySlug('career-basics', 42);

      expect(enrollmentsService.findByStudentAndCourse).toHaveBeenCalledWith(
        42,
        'course-1',
      );
      expect(result.isEnrolled).toBe(false);
      expect(result.enrollmentStatus).toBeNull();
    });

    it('should attach the raw enrollment status for an enrolled student', async () => {
      enrollmentsService.findByStudentAndCourse.mockResolvedValue({
        id: 'enrollment-1',
        status: 'in_progress',
      });

      const result = await service.findPublishedBySlug('career-basics', 42);

      expect(result.isEnrolled).toBe(true);
      expect(result.enrollmentStatus).toBe('in_progress');
      expect(result.enrollmentId).toBe('enrollment-1');
    });
  });

  it('should null out optional course fields rather than emitting undefined', async () => {
    coursesService.findBySlug.mockResolvedValue({
      id: 'course-2',
      slug: 'bare',
      title: 'Bare',
      status: 'published',
      language: 'en',
      price: 0,
      isFree: true,
      hasCertificate: false,
    });

    const result = await service.findPublishedBySlug('bare');

    expect(result.shortDescription).toBeNull();
    expect(result.fullDescription).toBeNull();
    expect(result.thumbnailUrl).toBeNull();
    expect(result.introVideoUrl).toBeNull();
    expect(result.instructor).toBeNull();
    expect(result.level).toBeNull();
    expect(result.category).toBeNull();
    expect(result.avgRating).toBeNull();
    expect(result.totalSections).toBe(0);
    expect(result.totalLectures).toBe(0);
  });
});
