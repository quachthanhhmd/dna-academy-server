import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { CourseDetailService } from './course-detail.service';

describe('CourseDetailService', () => {
  let service: CourseDetailService;

  let coursesService: { findById: jest.Mock<any> };
  let sectionsService: { findByCourseId: jest.Mock<any> };
  let lecturesService: {
    findBySectionId: jest.Mock<any>;
    findIdsWithContentByCourseId: jest.Mock<any>;
  };
  let courseLearningOutcomesService: { findByCourseId: jest.Mock<any> };
  let courseRequirementsService: { findByCourseId: jest.Mock<any> };
  let courseTargetLearnersService: { findByCourseId: jest.Mock<any> };
  let courseGroupAssignmentsService: { findByCourseId: jest.Mock<any> };
  let courseInstructorsService: { findViewByCourseId: jest.Mock<any> };

  beforeEach(() => {
    coursesService = { findById: jest.fn() };
    sectionsService = { findByCourseId: jest.fn() };
    lecturesService = {
      findBySectionId: jest.fn(),
      findIdsWithContentByCourseId: (
        jest.fn() as jest.Mock<any>
      ).mockResolvedValue(new Set<string>()),
    };
    courseLearningOutcomesService = { findByCourseId: jest.fn() };
    courseRequirementsService = { findByCourseId: jest.fn() };
    courseTargetLearnersService = { findByCourseId: jest.fn() };
    courseGroupAssignmentsService = { findByCourseId: jest.fn() };
    courseInstructorsService = { findViewByCourseId: jest.fn() };
    courseInstructorsService.findViewByCourseId.mockResolvedValue({
      primaryInstructor: null,
      coInstructors: [],
    });

    service = new CourseDetailService(
      coursesService as any,
      sectionsService as any,
      lecturesService as any,
      courseLearningOutcomesService as any,
      courseRequirementsService as any,
      courseTargetLearnersService as any,
      courseGroupAssignmentsService as any,
      courseInstructorsService as any,
    );
  });

  it('should expose the primary and co-instructors on the detail payload', async () => {
    coursesService.findById.mockResolvedValue({ id: 'course-1' });
    sectionsService.findByCourseId.mockResolvedValue([]);
    courseLearningOutcomesService.findByCourseId.mockResolvedValue([]);
    courseRequirementsService.findByCourseId.mockResolvedValue([]);
    courseTargetLearnersService.findByCourseId.mockResolvedValue([]);
    courseGroupAssignmentsService.findByCourseId.mockResolvedValue([]);
    courseInstructorsService.findViewByCourseId.mockResolvedValue({
      primaryInstructor: { id: 'ins-1' },
      coInstructors: [{ id: 'ins-2' }],
    });

    const result = await service.findDetail('course-1');

    expect(result.primaryInstructor).toEqual({ id: 'ins-1' });
    expect(result.coInstructors).toEqual([{ id: 'ins-2' }]);
  });

  it('should 404 when the course does not exist', async () => {
    coursesService.findById.mockResolvedValue(null);

    await expect(service.findDetail('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should re-expose fields the Course domain class normally excludes from serialization', async () => {
    coursesService.findById.mockResolvedValue({
      id: 'course-1',
      title: 'Intro',
      totalSections: 2,
      totalLectures: 5,
      totalDurationSecs: 600,
      publishedAt: null,
      publishedBy: null,
    });
    sectionsService.findByCourseId.mockResolvedValue([]);
    courseLearningOutcomesService.findByCourseId.mockResolvedValue([]);
    courseRequirementsService.findByCourseId.mockResolvedValue([]);
    courseTargetLearnersService.findByCourseId.mockResolvedValue([]);
    courseGroupAssignmentsService.findByCourseId.mockResolvedValue([]);

    const result = await service.findDetail('course-1');

    expect(result.totalSections).toBe(2);
    expect(result.totalLectures).toBe(5);
    expect(result.totalDurationSecs).toBe(600);
  });

  it('should nest lectures under each section, ordered as returned by the section/lecture services', async () => {
    coursesService.findById.mockResolvedValue({ id: 'course-1' });
    sectionsService.findByCourseId.mockResolvedValue([
      { id: 'section-1', title: 'Section 1', displayOrder: 1 },
      { id: 'section-2', title: 'Section 2', displayOrder: 2 },
    ]);
    lecturesService.findBySectionId.mockImplementation((sectionId: string) =>
      Promise.resolve(
        sectionId === 'section-1'
          ? [{ id: 'lecture-1', title: 'Lecture 1' }]
          : [],
      ),
    );
    courseLearningOutcomesService.findByCourseId.mockResolvedValue([]);
    courseRequirementsService.findByCourseId.mockResolvedValue([]);
    courseTargetLearnersService.findByCourseId.mockResolvedValue([]);
    courseGroupAssignmentsService.findByCourseId.mockResolvedValue([]);

    const result = await service.findDetail('course-1');

    expect(result.sections).toEqual([
      {
        id: 'section-1',
        title: 'Section 1',
        displayOrder: 1,
        lectures: [{ id: 'lecture-1', title: 'Lecture 1', hasContent: false }],
      },
      { id: 'section-2', title: 'Section 2', displayOrder: 2, lectures: [] },
    ]);
  });

  /*
    The curriculum screen labels each lecture "has content / no content". It
    used to know only about lectures saved in the current session, so every
    row read as empty after a reload.
  */
  it('should mark which lectures already have content saved', async () => {
    coursesService.findById.mockResolvedValue({ id: 'course-1' });
    sectionsService.findByCourseId.mockResolvedValue([
      { id: 'section-1', title: 'Section 1', displayOrder: 1 },
    ]);
    lecturesService.findBySectionId.mockResolvedValue([
      { id: 'lecture-1', title: 'Filled in' },
      { id: 'lecture-2', title: 'Still empty' },
    ]);
    lecturesService.findIdsWithContentByCourseId.mockResolvedValue(
      new Set(['lecture-1']),
    );
    courseLearningOutcomesService.findByCourseId.mockResolvedValue([]);
    courseRequirementsService.findByCourseId.mockResolvedValue([]);
    courseTargetLearnersService.findByCourseId.mockResolvedValue([]);
    courseGroupAssignmentsService.findByCourseId.mockResolvedValue([]);

    const result = await service.findDetail('course-1');

    expect(result.sections[0].lectures).toEqual([
      { id: 'lecture-1', title: 'Filled in', hasContent: true },
      { id: 'lecture-2', title: 'Still empty', hasContent: false },
    ]);
  });

  it('should ask for the content flags once for the whole course', async () => {
    coursesService.findById.mockResolvedValue({ id: 'course-1' });
    sectionsService.findByCourseId.mockResolvedValue([
      { id: 'section-1', title: 'S1', displayOrder: 1 },
      { id: 'section-2', title: 'S2', displayOrder: 2 },
      { id: 'section-3', title: 'S3', displayOrder: 3 },
    ]);
    lecturesService.findBySectionId.mockResolvedValue([{ id: 'l1' }]);
    courseLearningOutcomesService.findByCourseId.mockResolvedValue([]);
    courseRequirementsService.findByCourseId.mockResolvedValue([]);
    courseTargetLearnersService.findByCourseId.mockResolvedValue([]);
    courseGroupAssignmentsService.findByCourseId.mockResolvedValue([]);

    await service.findDetail('course-1');

    expect(lecturesService.findIdsWithContentByCourseId).toHaveBeenCalledTimes(
      1,
    );
  });

  it('should include outcomes, requirements, targetLearners, and groupIds', async () => {
    coursesService.findById.mockResolvedValue({ id: 'course-1' });
    sectionsService.findByCourseId.mockResolvedValue([]);
    courseLearningOutcomesService.findByCourseId.mockResolvedValue([
      { id: 'o-1', description: 'Outcome 1', displayOrder: 1 },
    ]);
    courseRequirementsService.findByCourseId.mockResolvedValue([
      { id: 'r-1', description: 'Requirement 1', displayOrder: 1 },
    ]);
    courseTargetLearnersService.findByCourseId.mockResolvedValue([
      { id: 't-1', description: 'Learner 1', displayOrder: 1 },
    ]);
    courseGroupAssignmentsService.findByCourseId.mockResolvedValue([
      { id: 'ga-1', group: { id: 'group-1' } },
    ]);

    const result = await service.findDetail('course-1');

    expect(result.learningOutcomes).toEqual([
      { id: 'o-1', description: 'Outcome 1', displayOrder: 1 },
    ]);
    expect(result.requirements).toEqual([
      { id: 'r-1', description: 'Requirement 1', displayOrder: 1 },
    ]);
    expect(result.targetLearners).toEqual([
      { id: 't-1', description: 'Learner 1', displayOrder: 1 },
    ]);
    expect(result.groupIds).toEqual(['group-1']);
  });
});
