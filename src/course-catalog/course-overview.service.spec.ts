import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { CourseOverviewService } from './course-overview.service';
import { SequentialLockService } from '../learning/services/sequential-lock.service';

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
  let courseInstructorsService: { findViewByCourseId: jest.Mock<any> };
  let instructorsService: { findByIds: jest.Mock<any> };
  let instructorProfilesService: { toProfiles: jest.Mock<any> };
  let lectureProgressesService: { findByEnrollmentId: jest.Mock<any> };

  const profile = (id: string, fullName: string) => ({
    id,
    slug: `slug-${id}`,
    fullName,
    headline: 'Headline',
    profilePictureUrl: null,
    bio: '<p>Bio</p>',
    yearsOfExperience: 7,
    expertise: [{ id: 'code-1', code: 'data', name: 'Data' }],
    socialLinks: [{ platform: 'linkedin', url: 'https://x', displayOrder: 0 }],
  });

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
    courseInstructorsService = { findViewByCourseId: jest.fn() };
    instructorsService = { findByIds: jest.fn() };
    instructorProfilesService = { toProfiles: jest.fn() };
    lectureProgressesService = { findByEnrollmentId: jest.fn() };

    coursesService.findBySlug.mockResolvedValue(publishedCourse);
    sectionsService.findByCourseId.mockResolvedValue([]);
    lecturesService.findBySectionId.mockResolvedValue([]);
    courseLearningOutcomesService.findByCourseId.mockResolvedValue([]);
    courseRequirementsService.findByCourseId.mockResolvedValue([]);
    courseTargetLearnersService.findByCourseId.mockResolvedValue([]);
    courseGroupAssignmentsService.findByCourseId.mockResolvedValue([]);
    enrollmentsService.findByStudentAndCourse.mockResolvedValue(null);
    courseInstructorsService.findViewByCourseId.mockResolvedValue({
      primaryInstructor: null,
      coInstructors: [],
    });
    instructorsService.findByIds.mockResolvedValue([]);
    instructorProfilesService.toProfiles.mockResolvedValue(new Map());
    lectureProgressesService.findByEnrollmentId.mockResolvedValue([]);

    service = new CourseOverviewService(
      coursesService as any,
      sectionsService as any,
      lecturesService as any,
      courseLearningOutcomesService as any,
      courseRequirementsService as any,
      courseTargetLearnersService as any,
      courseGroupAssignmentsService as any,
      enrollmentsService as any,
      courseInstructorsService as any,
      instructorsService as any,
      instructorProfilesService as any,
      lectureProgressesService as any,
      new SequentialLockService(),
    );
  });

  it('should expose requiresSequentialCompletion for the notice and player', async () => {
    coursesService.findBySlug.mockResolvedValue({
      ...publishedCourse,
      requiresSequentialCompletion: true,
    });

    const result = await service.findPublishedBySlug('career-basics');

    expect(result.requiresSequentialCompletion).toBe(true);
  });

  it('should default requiresSequentialCompletion to false', async () => {
    const result = await service.findPublishedBySlug('career-basics');

    expect(result.requiresSequentialCompletion).toBe(false);
  });

  describe('instructors', () => {
    it('should return the full primary profile and the co-instructors', async () => {
      courseInstructorsService.findViewByCourseId.mockResolvedValue({
        primaryInstructor: { id: 'ins-1' },
        coInstructors: [{ id: 'ins-2' }],
      });
      instructorsService.findByIds.mockResolvedValue([
        { id: 'ins-1' },
        { id: 'ins-2' },
      ]);
      instructorProfilesService.toProfiles.mockResolvedValue(
        new Map([
          ['ins-1', profile('ins-1', 'Jane Doe')],
          ['ins-2', profile('ins-2', 'John Roe')],
        ]),
      );

      const result = await service.findPublishedBySlug('career-basics');

      expect(result.primaryInstructor).toMatchObject({
        id: 'ins-1',
        fullName: 'Jane Doe',
        bio: '<p>Bio</p>',
        expertise: [{ id: 'code-1', code: 'data', name: 'Data' }],
        socialLinks: [
          { platform: 'linkedin', url: 'https://x', displayOrder: 0 },
        ],
      });
      expect(result.coInstructors).toHaveLength(1);
      expect(result.coInstructors[0]).toMatchObject({ id: 'ins-2' });
    });

    it('should load every profile for the course in one batch', async () => {
      courseInstructorsService.findViewByCourseId.mockResolvedValue({
        primaryInstructor: { id: 'ins-1' },
        coInstructors: [{ id: 'ins-2' }, { id: 'ins-3' }],
      });
      instructorsService.findByIds.mockResolvedValue([]);

      await service.findPublishedBySlug('career-basics');

      expect(instructorsService.findByIds).toHaveBeenCalledWith([
        'ins-1',
        'ins-2',
        'ins-3',
      ]);
      expect(instructorProfilesService.toProfiles).toHaveBeenCalledTimes(1);
    });

    it('should keep the co-instructor order the join table returned', async () => {
      courseInstructorsService.findViewByCourseId.mockResolvedValue({
        primaryInstructor: { id: 'ins-1' },
        coInstructors: [{ id: 'ins-3' }, { id: 'ins-2' }],
      });
      instructorsService.findByIds.mockResolvedValue([]);
      instructorProfilesService.toProfiles.mockResolvedValue(
        new Map([
          ['ins-2', profile('ins-2', 'Two')],
          ['ins-3', profile('ins-3', 'Three')],
        ]),
      );

      const result = await service.findPublishedBySlug('career-basics');

      expect(result.coInstructors.map((item) => item.id)).toEqual([
        'ins-3',
        'ins-2',
      ]);
    });

    it('should skip an instructor whose profile could not be resolved', async () => {
      courseInstructorsService.findViewByCourseId.mockResolvedValue({
        primaryInstructor: { id: 'ins-1' },
        coInstructors: [{ id: 'ins-missing' }],
      });
      instructorsService.findByIds.mockResolvedValue([]);
      instructorProfilesService.toProfiles.mockResolvedValue(
        new Map([['ins-1', profile('ins-1', 'Jane Doe')]]),
      );

      const result = await service.findPublishedBySlug('career-basics');

      expect(result.coInstructors).toEqual([]);
    });
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
              progressStatus: null,
              isLocked: false,
              lockReason: null,
              requiredLectureId: null,
              watchDurationSecs: null,
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
    expect(result.primaryInstructor).toBeNull();
    expect(result.coInstructors).toEqual([]);
    expect(result.level).toBeNull();
    expect(result.category).toBeNull();
    expect(result.avgRating).toBeNull();
    expect(result.totalSections).toBe(0);
    expect(result.totalLectures).toBe(0);
  });

  /**
   * Epic 4.3 §2.2 — the whole access matrix, one case per documented row.
   *
   * Table-driven and asserting all five fields together on purpose: checking
   * them one at a time is how a payload ends up self-contradictory, e.g.
   * `isLocked: true` with `lockReason: null`.
   */
  describe('Epic 4.3 — curriculum access matrix', () => {
    const lecture = (id: string, overrides: Record<string, unknown> = {}) => ({
      id,
      title: `L-${id}`,
      lectureType: 'video',
      durationSecs: 300,
      isPreview: false,
      requiresCompletion: true,
      displayOrder: Number(id.replace(/\D/g, '')) || 1,
      ...overrides,
    });

    /** 1 is a free preview; 2, 3 and 4 are not. */
    const lectures = [
      lecture('l1', { isPreview: true, displayOrder: 1 }),
      lecture('l2', { displayOrder: 2 }),
      lecture('l3', { displayOrder: 3 }),
    ];

    const course = (requiresSequentialCompletion: boolean) => ({
      ...publishedCourse,
      requiresSequentialCompletion,
    });

    const enrol = (status = 'in_progress') =>
      enrollmentsService.findByStudentAndCourse.mockResolvedValue({
        id: 'enr-1',
        status,
      });

    const rows = async (studentId?: number) =>
      (await service.findPublishedBySlug('c', studentId)).curriculum.flatMap(
        (section) => section.lectures,
      );

    beforeEach(() => {
      sectionsService.findByCourseId.mockResolvedValue([
        { id: 'section-1', title: 'Section 1', displayOrder: 1 },
      ]);
      lecturesService.findBySectionId.mockResolvedValue(lectures);
      coursesService.findBySlug.mockResolvedValue(course(false));
    });

    /**
     * The regression this epic exists for. A guest on a course *without*
     * sequential completion was told every lecture was open, because the guest
     * rule was `requiresSequentialCompletion && !isPreview`. Sequential
     * completion orders lectures *within* a course; it says nothing about
     * someone who has not enrolled. This case would have failed for as long as
     * the code has existed — nothing rendered the field, so nobody noticed.
     */
    it('should lock every non-preview lecture for a guest on a NON-sequential course', async () => {
      const found = await rows();

      expect(found.map((l) => [l.id, l.isLocked])).toEqual([
        ['l1', false],
        ['l2', true],
        ['l3', true],
      ]);
    });

    it('should apply the same guest rule on a sequential course', async () => {
      coursesService.findBySlug.mockResolvedValue(course(true));

      const found = await rows();

      // Identical to the non-sequential answer: the flag is irrelevant here.
      expect(found.map((l) => [l.id, l.isLocked])).toEqual([
        ['l1', false],
        ['l2', true],
        ['l3', true],
      ]);
    });

    it('should return the documented guest row in full', async () => {
      const [preview, locked] = await rows();

      expect(preview).toMatchObject({
        progressStatus: null,
        isLocked: false,
        lockReason: null,
        requiredLectureId: null,
        watchDurationSecs: null,
      });
      expect(locked).toMatchObject({
        progressStatus: null,
        isLocked: true,
        lockReason: 'NOT_ENROLLED',
        requiredLectureId: null,
        watchDurationSecs: null,
      });
    });

    it('should unlock everything for an enrolled caller on a NON-sequential course', async () => {
      enrol();
      lectureProgressesService.findByEnrollmentId.mockResolvedValue([
        { lecture: { id: 'l1' }, status: 'completed', watchDurationSecs: 300 },
      ]);

      const found = await rows(7);

      expect(
        found.every(
          (l) =>
            l.isLocked === false &&
            l.lockReason === null &&
            l.requiredLectureId === null,
        ),
      ).toBe(true);
      expect(found[0]).toMatchObject({
        progressStatus: 'completed',
        watchDurationSecs: 300,
      });
    });

    it('should name the blocker on a sequential course mid-progress', async () => {
      coursesService.findBySlug.mockResolvedValue(course(true));
      enrol();
      lectureProgressesService.findByEnrollmentId.mockResolvedValue([
        { lecture: { id: 'l1' }, status: 'completed', watchDurationSecs: 300 },
      ]);

      const found = await rows(7);

      expect(found[0]).toMatchObject({ isLocked: false, lockReason: null });
      // l2's predecessor l1 is done, so l2 is open.
      expect(found[1]).toMatchObject({
        isLocked: false,
        lockReason: null,
        requiredLectureId: null,
      });
      // l3 is blocked by l2, and says so.
      expect(found[2]).toMatchObject({
        isLocked: true,
        lockReason: 'PREVIOUS_LECTURE_INCOMPLETE',
        requiredLectureId: 'l2',
      });
    });

    it('should let an optional lecture neither lock itself nor block its successor', async () => {
      coursesService.findBySlug.mockResolvedValue(course(true));
      enrol();
      lecturesService.findBySectionId.mockResolvedValue([
        lecture('l1', { isPreview: true, displayOrder: 1 }),
        lecture('l2', { requiresCompletion: false, displayOrder: 2 }),
        lecture('l3', { displayOrder: 3 }),
      ]);
      lectureProgressesService.findByEnrollmentId.mockResolvedValue([
        { lecture: { id: 'l1' }, status: 'completed' },
      ]);

      const found = await rows(7);

      // l2 is optional: open despite being unfinished, and l3 looks past it to
      // l1, which is complete.
      expect(found[1]).toMatchObject({ isLocked: false, lockReason: null });
      expect(found[2]).toMatchObject({
        isLocked: false,
        lockReason: null,
        requiredLectureId: null,
      });
    });

    it('should treat a cancelled enrollment as a guest', async () => {
      enrol('cancelled');

      const found = await rows(7);

      expect(found.map((l) => l.progressStatus)).toEqual([null, null, null]);
      expect(found[1]).toMatchObject({
        isLocked: true,
        lockReason: 'NOT_ENROLLED',
      });
      expect(
        lectureProgressesService.findByEnrollmentId,
      ).not.toHaveBeenCalled();
    });

    // `null` and `not_started` are different answers: null is "not enrolled",
    // which is how the client decides to hide a completion counter rather than
    // render `0 / 3`.
    it('should say not_started, not null, for an enrolled caller who has done nothing', async () => {
      enrol();

      const found = await rows(7);

      expect(found.map((l) => l.progressStatus)).toEqual([
        'not_started',
        'not_started',
        'not_started',
      ]);
      expect(found.every((l) => l.watchDurationSecs === 0)).toBe(true);
    });

    /**
     * §2.2 — `lockReason` is non-null exactly when `isLocked` is true. Cheap
     * to check, and it holds on every branch, so it is checked on every branch.
     */
    it.each([
      ['guest, non-sequential', false, undefined, 'none'],
      ['guest, sequential', true, undefined, 'none'],
      ['enrolled, non-sequential', false, 7, 'partial'],
      ['enrolled, sequential', true, 7, 'partial'],
      ['cancelled', true, 7, 'cancelled'],
    ] as const)(
      'should keep lockReason non-null exactly when locked — %s',
      async (_label, sequential, studentId, enrolment) => {
        coursesService.findBySlug.mockResolvedValue(course(sequential));

        if (enrolment === 'partial') {
          enrol();
          lectureProgressesService.findByEnrollmentId.mockResolvedValue([
            { lecture: { id: 'l1' }, status: 'completed' },
          ]);
        } else if (enrolment === 'cancelled') {
          enrol('cancelled');
        }

        const found = await rows(studentId);

        for (const item of found) {
          expect(item.lockReason === null).toBe(item.isLocked === false);
        }
      },
    );

    it('should read progress once for the whole course, not once per lecture', async () => {
      enrol();

      await rows(7);

      expect(lectureProgressesService.findByEnrollmentId).toHaveBeenCalledTimes(
        1,
      );
    });

    it('should cost a guest no progress query at all', async () => {
      await rows();

      expect(
        lectureProgressesService.findByEnrollmentId,
      ).not.toHaveBeenCalled();
    });
  });
});
