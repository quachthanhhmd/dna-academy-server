import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { SequentialLockService } from './sequential-lock.service';

describe('ProgressService', () => {
  let service: ProgressService;
  let lecturesService: { findById: jest.Mock<any> };
  let sectionsService: { findById: jest.Mock<any> };
  let coursesService: { findById: jest.Mock<any> };
  let enrollmentsService: { findByStudentAndCourse: jest.Mock<any> };
  let lectureProgressesService: {
    findByEnrollmentId: jest.Mock<any>;
    findByEnrollmentAndLecture: jest.Mock<any>;
    create: jest.Mock<any>;
    update: jest.Mock<any>;
  };
  let curriculumService: { orderedLectures: jest.Mock<any> };
  let completionDetector: { recompute: jest.Mock<any> };

  const course = {
    id: 'course-1',
    status: 'published',
    requiresSequentialCompletion: false,
  };

  beforeEach(() => {
    lecturesService = {
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        id: 'a',
        section: { id: 's1' },
        requiresCompletion: true,
      }),
    };
    sectionsService = {
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        id: 's1',
        course: { id: 'course-1' },
      }),
    };
    coursesService = {
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue(course),
    };
    enrollmentsService = {
      findByStudentAndCourse: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        id: 'enr-1',
        status: 'in_progress',
      }),
    };
    lectureProgressesService = {
      findByEnrollmentId: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
      findByEnrollmentAndLecture: (
        jest.fn() as jest.Mock<any>
      ).mockResolvedValue(null),
      create: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'lp-1' }),
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'lp-1' }),
    };
    curriculumService = {
      orderedLectures: (jest.fn() as jest.Mock<any>).mockResolvedValue([
        { id: 'a', requiresCompletion: true },
        { id: 'b', requiresCompletion: true },
      ]),
    };
    completionDetector = {
      recompute: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        progressPct: 50,
        enrollmentStatus: 'in_progress',
      }),
    };

    service = new ProgressService(
      lecturesService as any,
      sectionsService as any,
      coursesService as any,
      enrollmentsService as any,
      lectureProgressesService as any,
      curriculumService as any,
      new SequentialLockService(),
      completionDetector as any,
    );
  });

  describe('record', () => {
    it('should create a progress row on the first ping', async () => {
      await service.record('a', 7, { status: 'in_progress' });

      expect(lectureProgressesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          enrollment: { id: 'enr-1' },
          lecture: { id: 'a' },
          status: 'in_progress',
          startedAt: expect.any(Date),
        }),
      );
    });

    it('should update the existing row on later pings', async () => {
      lectureProgressesService.findByEnrollmentAndLecture.mockResolvedValue({
        id: 'lp-1',
        status: 'in_progress',
      });

      await service.record('a', 7, { status: 'completed' });

      expect(lectureProgressesService.create).not.toHaveBeenCalled();
      expect(lectureProgressesService.update).toHaveBeenCalledWith(
        'lp-1',
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
        }),
      );
    });

    it('should stamp completedAt only when completing', async () => {
      await service.record('a', 7, { status: 'in_progress' });

      const payload = lectureProgressesService.create.mock
        .calls[0][0] as Record<string, unknown>;
      expect(payload.completedAt).toBeNull();
    });

    it('should not move completedAt on a repeat completion', async () => {
      const completedAt = new Date('2026-01-01');
      lectureProgressesService.findByEnrollmentAndLecture.mockResolvedValue({
        id: 'lp-1',
        status: 'completed',
        completedAt,
      });

      await service.record('a', 7, { status: 'completed' });

      const payload = lectureProgressesService.update.mock
        .calls[0][1] as Record<string, unknown>;
      expect(payload.completedAt).toBe(completedAt);
    });

    it('should persist the watch duration when supplied', async () => {
      await service.record('a', 7, {
        status: 'completed',
        watchDurationSecs: 120,
      });

      expect(lectureProgressesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ watchDurationSecs: 120 }),
      );
    });

    it('should return the recomputed enrollment progress', async () => {
      completionDetector.recompute.mockResolvedValue({
        progressPct: 100,
        enrollmentStatus: 'completed',
      });

      await expect(
        service.record('a', 7, { status: 'completed' }),
      ).resolves.toEqual({ progressPct: 100, enrollmentStatus: 'completed' });
    });

    it('should 403 when the student is not enrolled', async () => {
      enrollmentsService.findByStudentAndCourse.mockResolvedValue(null);

      await expect(
        service.record('a', 7, { status: 'completed' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should 404 an unknown lecture', async () => {
      lecturesService.findById.mockResolvedValue(null);

      await expect(
        service.record('zzz', 7, { status: 'completed' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should refuse to record progress on a locked lecture', async () => {
      coursesService.findById.mockResolvedValue({
        ...course,
        requiresSequentialCompletion: true,
      });
      lecturesService.findById.mockResolvedValue({
        id: 'b',
        section: { id: 's1' },
        requiresCompletion: true,
      });

      await expect(
        service.record('b', 7, { status: 'completed' }),
      ).rejects.toMatchObject({
        response: { code: 'PREVIOUS_LECTURE_INCOMPLETE' },
      });
    });
  });

  describe('saveWatchPosition', () => {
    it('should store the position without touching the status', async () => {
      lectureProgressesService.findByEnrollmentAndLecture.mockResolvedValue({
        id: 'lp-1',
        status: 'in_progress',
      });

      await service.saveWatchPosition('a', 7, 90);

      expect(lectureProgressesService.update).toHaveBeenCalledWith('lp-1', {
        watchDurationSecs: 90,
      });
    });

    it('should create an in-progress row when none exists yet', async () => {
      await service.saveWatchPosition('a', 7, 30);

      expect(lectureProgressesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
          watchDurationSecs: 30,
        }),
      );
    });

    it('should not recompute course progress', async () => {
      await service.saveWatchPosition('a', 7, 30);

      expect(completionDetector.recompute).not.toHaveBeenCalled();
    });
  });

  /**
   * Epic 4.2 §2.4(a) / D7 — `not_started → in_progress → completed`, one way.
   *
   * The player pings `in_progress` whenever a lecture is opened. Accepting
   * that over an existing `completed` dropped progressPct, demoted the
   * enrollment out of `completed`, hid the student's certificate and — on a
   * sequential course — re-locked every lecture after it. BUG-01.
   */
  describe('monotonic lecture status (BUG-01)', () => {
    const completedRow = {
      id: 'lp-1',
      status: 'completed',
      completedAt: new Date('2026-09-01'),
      watchDurationSecs: 300,
    };

    it('should ignore a demotion from completed to in_progress', async () => {
      lectureProgressesService.findByEnrollmentAndLecture.mockResolvedValue(
        completedRow,
      );

      await service.record('a', 7, { status: 'in_progress' });

      expect(lectureProgressesService.update).toHaveBeenCalledWith(
        'lp-1',
        expect.objectContaining({ status: 'completed' }),
      );
    });

    it('should ignore a demotion to not_started', async () => {
      lectureProgressesService.findByEnrollmentAndLecture.mockResolvedValue(
        completedRow,
      );

      await service.record('a', 7, { status: 'not_started' as never });

      expect(lectureProgressesService.update).toHaveBeenCalledWith(
        'lp-1',
        expect.objectContaining({ status: 'completed' }),
      );
    });

    it('should not demote in_progress back to not_started', async () => {
      lectureProgressesService.findByEnrollmentAndLecture.mockResolvedValue({
        id: 'lp-1',
        status: 'in_progress',
        completedAt: null,
      });

      await service.record('a', 7, { status: 'not_started' as never });

      expect(lectureProgressesService.update).toHaveBeenCalledWith(
        'lp-1',
        expect.objectContaining({ status: 'in_progress' }),
      );
    });

    // A no-op on status, not an error: v2.3 §4.5 already promises re-posting
    // `completed` is idempotent, and a 409 would break a client that simply
    // reopens a lecture.
    it('should still answer 200 with the current progress on a demotion', async () => {
      lectureProgressesService.findByEnrollmentAndLecture.mockResolvedValue(
        completedRow,
      );
      completionDetector.recompute.mockResolvedValue({
        progressPct: 100,
        enrollmentStatus: 'completed',
      });

      await expect(
        service.record('a', 7, { status: 'in_progress' }),
      ).resolves.toMatchObject({
        progressPct: 100,
        enrollmentStatus: 'completed',
      });
    });

    // The stray ping still carries a useful watch position; only the status
    // is refused.
    it('should still write watchDurationSecs on a demotion', async () => {
      lectureProgressesService.findByEnrollmentAndLecture.mockResolvedValue(
        completedRow,
      );

      await service.record('a', 7, {
        status: 'in_progress',
        watchDurationSecs: 420,
      });

      expect(lectureProgressesService.update).toHaveBeenCalledWith(
        'lp-1',
        expect.objectContaining({
          status: 'completed',
          watchDurationSecs: 420,
        }),
      );
    });

    it('should still promote in_progress to completed', async () => {
      lectureProgressesService.findByEnrollmentAndLecture.mockResolvedValue({
        id: 'lp-1',
        status: 'in_progress',
        completedAt: null,
      });

      await service.record('a', 7, { status: 'completed' });

      expect(lectureProgressesService.update).toHaveBeenCalledWith(
        'lp-1',
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
        }),
      );
    });

    it('should still promote a fresh row to in_progress', async () => {
      await service.record('a', 7, { status: 'in_progress' });

      expect(lectureProgressesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'in_progress' }),
      );
    });

    it('should keep the earned completion date on a re-completion', async () => {
      lectureProgressesService.findByEnrollmentAndLecture.mockResolvedValue(
        completedRow,
      );

      await service.record('a', 7, { status: 'completed' });

      expect(lectureProgressesService.update).toHaveBeenCalledWith(
        'lp-1',
        expect.objectContaining({ completedAt: completedRow.completedAt }),
      );
    });

    /**
     * BUG-03 — a demoted row used to read `in_progress` while still carrying
     * `completedAt`. Monotonicity makes that pair unreachable.
     */
    it('should never write in_progress together with a completion date', async () => {
      lectureProgressesService.findByEnrollmentAndLecture.mockResolvedValue(
        completedRow,
      );

      await service.record('a', 7, { status: 'in_progress' });

      const [, payload] = lectureProgressesService.update.mock.calls[0] as [
        string,
        { status: string; completedAt: Date | null },
      ];

      expect(
        payload.completedAt === null || payload.status === 'completed',
      ).toBe(true);
    });

    it('should tolerate an unrecognised stored status rather than locking the row', async () => {
      lectureProgressesService.findByEnrollmentAndLecture.mockResolvedValue({
        id: 'lp-1',
        status: 'something_else',
        completedAt: null,
      });

      await service.record('a', 7, { status: 'completed' });

      expect(lectureProgressesService.update).toHaveBeenCalledWith(
        'lp-1',
        expect.objectContaining({ status: 'completed' }),
      );
    });
  });
});
