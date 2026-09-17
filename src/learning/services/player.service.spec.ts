import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CompletionDetectorService } from './completion-detector.service';
import { PlayerService } from './player.service';
import { SequentialLockService } from './sequential-lock.service';

describe('PlayerService', () => {
  let service: PlayerService;
  let coursesService: { findBySlug: jest.Mock<any> };
  let enrollmentsService: {
    findByStudentAndCourse: jest.Mock<any>;
    findById: jest.Mock<any>;
    update: jest.Mock<any>;
  };
  let curriculumService: { orderedLectures: jest.Mock<any> };
  let lectureProgressesService: { findByEnrollmentId: jest.Mock<any> };
  let lectureContentService: { payloadFor: jest.Mock<any> };

  const lec = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    title: `L-${id}`,
    lectureType: 'video',
    requiresCompletion: true,
    isPreview: false,
    durationSecs: 60,
    displayOrder: 1,
    section: { id: 's1', title: 'S1' },
    ...extra,
  });

  const course = {
    id: 'course-1',
    slug: 'intro',
    status: 'published',
    requiresSequentialCompletion: false,
  };
  const enrollment = { id: 'enr-1', status: 'in_progress', course };

  beforeEach(() => {
    coursesService = {
      findBySlug: (jest.fn() as jest.Mock<any>).mockResolvedValue(course),
    };
    enrollmentsService = {
      findByStudentAndCourse: (jest.fn() as jest.Mock<any>).mockResolvedValue(
        enrollment,
      ),
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        ...enrollment,
        student: { id: 7 },
      }),
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue(enrollment),
    };
    curriculumService = {
      orderedLectures: (jest.fn() as jest.Mock<any>).mockResolvedValue([
        lec('a'),
        lec('b'),
      ]),
    };
    lectureProgressesService = {
      findByEnrollmentId: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
    };
    lectureContentService = {
      payloadFor: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        youtubeVideoId: 'abc',
      }),
    };

    service = new PlayerService(
      coursesService as any,
      enrollmentsService as any,
      curriculumService as any,
      lectureProgressesService as any,
      lectureContentService as any,
      new SequentialLockService(),
    );
  });

  describe('startEnrollment', () => {
    it('should move enrolled to in_progress and stamp startedAt', async () => {
      enrollmentsService.findById.mockResolvedValue({
        id: 'enr-1',
        status: 'enrolled',
        student: { id: 7 },
        course,
      });

      await service.startEnrollment('enr-1', 7);

      expect(enrollmentsService.update).toHaveBeenCalledWith(
        'enr-1',
        expect.objectContaining({
          status: 'in_progress',
          startedAt: expect.any(Date),
        }),
      );
    });

    it('should be idempotent for an already started enrollment', async () => {
      const startedAt = new Date('2026-01-01');
      enrollmentsService.findById.mockResolvedValue({
        id: 'enr-1',
        status: 'in_progress',
        startedAt,
        student: { id: 7 },
        course,
      });

      const result = await service.startEnrollment('enr-1', 7);

      expect(enrollmentsService.update).not.toHaveBeenCalled();
      expect(result.startedAt).toBe(startedAt);
    });

    it("should refuse another student's enrollment", async () => {
      await expect(
        service.startEnrollment('enr-1', 999),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should 404 an unknown enrollment', async () => {
      enrollmentsService.findById.mockResolvedValue(null);

      await expect(service.startEnrollment('nope', 7)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('loadLecture', () => {
    it('should return the content payload with navigation', async () => {
      const result = await service.loadLecture('intro', 'a', 7);

      expect(result).toMatchObject({
        lectureId: 'a',
        lectureType: 'video',
        contentPayload: { youtubeVideoId: 'abc' },
        prevLectureId: null,
        nextLectureId: 'b',
        isLocked: false,
        lockReason: null,
      });
    });

    it('should 404 an unpublished course', async () => {
      coursesService.findBySlug.mockResolvedValue({
        ...course,
        status: 'draft',
      });

      await expect(service.loadLecture('intro', 'a', 7)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should 403 a student who is not enrolled', async () => {
      enrollmentsService.findByStudentAndCourse.mockResolvedValue(null);

      await expect(service.loadLecture('intro', 'a', 7)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should 404 a lecture that belongs to another course', async () => {
      await expect(
        service.loadLecture('intro', 'elsewhere', 7),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should 403 a locked lecture with the blocking id', async () => {
      coursesService.findBySlug.mockResolvedValue({
        ...course,
        requiresSequentialCompletion: true,
      });

      await expect(service.loadLecture('intro', 'b', 7)).rejects.toMatchObject({
        response: {
          code: 'PREVIOUS_LECTURE_INCOMPLETE',
          requiredLectureId: 'a',
        },
      });
    });

    it('should record the lecture as last accessed', async () => {
      await service.loadLecture('intro', 'a', 7);

      expect(enrollmentsService.update).toHaveBeenCalledWith(
        'enr-1',
        expect.objectContaining({
          lastLecture: { id: 'a' },
          lastAccessedAt: expect.any(Date),
        }),
      );
    });

    it('should surface existing progress and watch position', async () => {
      lectureProgressesService.findByEnrollmentId.mockResolvedValue([
        { lecture: { id: 'a' }, status: 'in_progress', watchDurationSecs: 42 },
      ]);

      const result = await service.loadLecture('intro', 'a', 7);

      expect(result.progressStatus).toBe('in_progress');
      expect(result.watchDurationSecs).toBe(42);
    });

    /*
      The header's dial and its "x/y lectures" used to come from different
      places — a client-side tally beside a percentage that only arrived with
      the first progress write — so a finished course could read "22/22" next
      to "27%". Both now come from here.
    */
    it('should report course progress over required lectures', async () => {
      curriculumService.orderedLectures.mockResolvedValue([
        lec('a'),
        lec('b'),
        lec('c'),
        lec('d'),
      ]);
      lectureProgressesService.findByEnrollmentId.mockResolvedValue([
        { lecture: { id: 'a' }, status: 'completed', watchDurationSecs: 60 },
        { lecture: { id: 'b' }, status: 'in_progress', watchDurationSecs: 10 },
      ]);

      const result = await service.loadLecture('intro', 'a', 7);

      expect(result).toMatchObject({
        progressPct: 25,
        completedRequired: 1,
        totalRequired: 4,
      });
    });

    it('should leave optional lectures out of progress, as the recompute does', async () => {
      curriculumService.orderedLectures.mockResolvedValue([
        lec('a'),
        lec('b', { requiresCompletion: false }),
      ]);
      lectureProgressesService.findByEnrollmentId.mockResolvedValue([
        { lecture: { id: 'a' }, status: 'completed', watchDurationSecs: 60 },
        { lecture: { id: 'b' }, status: 'completed', watchDurationSecs: 60 },
      ]);

      const result = await service.loadLecture('intro', 'a', 7);

      expect(result).toMatchObject({
        progressPct: 100,
        completedRequired: 1,
        totalRequired: 1,
      });
    });

    it('should report 0 progress for a course of only optional lectures', async () => {
      curriculumService.orderedLectures.mockResolvedValue([
        lec('a', { requiresCompletion: false }),
      ]);

      const result = await service.loadLecture('intro', 'a', 7);

      expect(result).toMatchObject({
        progressPct: 0,
        completedRequired: 0,
        totalRequired: 0,
      });
    });

    /*
      The bug in one test: the dial and the "x/y" line are produced by two
      different code paths — this read, and the detector behind the progress
      write — and the whole point of sending the counts from here is that the
      two can never disagree again. Same fixtures, both paths, same numbers.
    */
    it('should return the same counts as the progress write does', async () => {
      const ordered = [
        lec('a'),
        lec('b'),
        lec('c'),
        lec('d', { requiresCompletion: false }),
        lec('e'),
      ];
      const rows = [
        { lecture: { id: 'a' }, status: 'completed', watchDurationSecs: 60 },
        { lecture: { id: 'c' }, status: 'completed', watchDurationSecs: 60 },
        // Optional and completed: counts for neither side.
        { lecture: { id: 'd' }, status: 'completed', watchDurationSecs: 60 },
        { lecture: { id: 'e' }, status: 'in_progress', watchDurationSecs: 5 },
      ];

      curriculumService.orderedLectures.mockResolvedValue(ordered);
      lectureProgressesService.findByEnrollmentId.mockResolvedValue(rows);

      const detector = new CompletionDetectorService(
        enrollmentsService as any,
        curriculumService as any,
        lectureProgressesService as any,
        { issueFor: jest.fn() } as any,
      );

      const read = await service.loadLecture('intro', 'a', 7);
      const write = await detector.recompute('enr-1');

      expect({
        progressPct: read.progressPct,
        completedRequired: read.completedRequired,
        totalRequired: read.totalRequired,
      }).toEqual({
        progressPct: write.progressPct,
        completedRequired: write.completedRequired,
        totalRequired: write.totalRequired,
      });
      // 2 of 4 required — the optional one is in neither number.
      expect(read).toMatchObject({
        progressPct: 50,
        completedRequired: 2,
        totalRequired: 4,
      });
    });

    it('should default progress to not_started', async () => {
      const result = await service.loadLecture('intro', 'a', 7);

      expect(result.progressStatus).toBe('not_started');
      expect(result.watchDurationSecs).toBe(0);
    });
  });

  describe('previewLecture', () => {
    it('should return content for a preview lecture with no auth', async () => {
      curriculumService.orderedLectures.mockResolvedValue([
        lec('a', { isPreview: true }),
      ]);

      const result = await service.previewLecture('intro', 'a');

      expect(result.contentPayload).toEqual({ youtubeVideoId: 'abc' });
      expect(result.isPreview).toBe(true);
    });

    it('should report the course total but no completions to a guest', async () => {
      curriculumService.orderedLectures.mockResolvedValue([
        lec('a', { isPreview: true }),
        lec('b'),
      ]);

      const result = await service.previewLecture('intro', 'a');

      expect(result).toMatchObject({
        progressPct: 0,
        completedRequired: 0,
        totalRequired: 2,
      });
    });

    it('should never write progress', async () => {
      curriculumService.orderedLectures.mockResolvedValue([
        lec('a', { isPreview: true }),
      ]);

      await service.previewLecture('intro', 'a');

      expect(enrollmentsService.update).not.toHaveBeenCalled();
    });

    it('should 403 a lecture that is not marked preview', async () => {
      await expect(service.previewLecture('intro', 'a')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should ignore the sequential lock entirely', async () => {
      coursesService.findBySlug.mockResolvedValue({
        ...course,
        requiresSequentialCompletion: true,
      });
      curriculumService.orderedLectures.mockResolvedValue([
        lec('a'),
        lec('b', { isPreview: true }),
      ]);

      await expect(service.previewLecture('intro', 'b')).resolves.toBeDefined();
    });
  });

  /**
   * Epic 4 v2.2 — the article/PDF and quiz-instructions screens render a
   * per-lecture description. It must never fall back to the course's short
   * description: a null here means the FE hides the block entirely.
   */
  describe('v2.2 lecture description', () => {
    it('should expose the lecture description to the player', async () => {
      curriculumService.orderedLectures.mockResolvedValue([
        lec('a', { description: 'What this lesson covers' }),
        lec('b'),
      ]);

      const view = await service.loadLecture('intro', 'a', 7);

      expect(view.description).toBe('What this lesson covers');
    });

    it('should return null rather than falling back when there is no description', async () => {
      const view = await service.loadLecture('intro', 'a', 7);

      expect(view.description).toBeNull();
    });

    it('should expose the description on a guest preview too', async () => {
      curriculumService.orderedLectures.mockResolvedValue([
        lec('a', { isPreview: true, description: 'Free sample' }),
      ]);

      const view = await service.previewLecture('intro', 'a');

      expect(view.description).toBe('Free sample');
    });
  });
});
