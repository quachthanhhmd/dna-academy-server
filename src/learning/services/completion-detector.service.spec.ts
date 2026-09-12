import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { CompletionDetectorService } from './completion-detector.service';

describe('CompletionDetectorService', () => {
  let service: CompletionDetectorService;
  let enrollmentsService: { findById: jest.Mock<any>; update: jest.Mock<any> };
  let curriculumService: { orderedLectures: jest.Mock<any> };
  let lectureProgressesService: { findByEnrollmentId: jest.Mock<any> };
  let certificateService: { issueFor: jest.Mock<any> };

  const lec = (id: string, requiresCompletion = true) => ({
    id,
    requiresCompletion,
  });
  const progress = (lectureId: string, status: string) => ({
    lecture: { id: lectureId },
    status,
  });

  const enrollment = {
    id: 'enr-1',
    status: 'in_progress',
    progressPct: 0,
    course: { id: 'course-1' },
  };

  beforeEach(() => {
    enrollmentsService = {
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue(enrollment),
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue(enrollment),
    };
    curriculumService = {
      orderedLectures: (jest.fn() as jest.Mock<any>).mockResolvedValue([
        lec('a'),
        lec('b'),
        lec('c', false),
        lec('d'),
      ]),
    };
    lectureProgressesService = {
      findByEnrollmentId: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
    };
    certificateService = {
      issueFor: (jest.fn() as jest.Mock<any>).mockResolvedValue(undefined),
    };

    service = new CompletionDetectorService(
      enrollmentsService as any,
      curriculumService as any,
      lectureProgressesService as any,
      certificateService as any,
    );
  });

  it('should count only required lectures toward the percentage', async () => {
    lectureProgressesService.findByEnrollmentId.mockResolvedValue([
      progress('a', 'completed'),
      progress('c', 'completed'), // optional — must not count
    ]);

    const result = await service.recompute('enr-1');

    // 1 of 3 required
    expect(result.progressPct).toBe(33);
  });

  it('should round the percentage to a whole number', async () => {
    lectureProgressesService.findByEnrollmentId.mockResolvedValue([
      progress('a', 'completed'),
      progress('b', 'completed'),
    ]);

    expect((await service.recompute('enr-1')).progressPct).toBe(67);
  });

  it('should ignore in-progress rows', async () => {
    lectureProgressesService.findByEnrollmentId.mockResolvedValue([
      progress('a', 'completed'),
      progress('b', 'in_progress'),
    ]);

    expect((await service.recompute('enr-1')).progressPct).toBe(33);
  });

  it('should report 0 for a course with no required lectures', async () => {
    curriculumService.orderedLectures.mockResolvedValue([lec('c', false)]);

    const result = await service.recompute('enr-1');

    expect(result.progressPct).toBe(0);
    expect(result.enrollmentStatus).toBe('in_progress');
  });

  it('should complete the enrollment when every required lecture is done', async () => {
    lectureProgressesService.findByEnrollmentId.mockResolvedValue([
      progress('a', 'completed'),
      progress('b', 'completed'),
      progress('d', 'completed'),
    ]);

    const result = await service.recompute('enr-1');

    expect(result.progressPct).toBe(100);
    expect(result.enrollmentStatus).toBe('completed');
    expect(enrollmentsService.update).toHaveBeenCalledWith(
      'enr-1',
      expect.objectContaining({
        progressPct: 100,
        status: 'completed',
        completedAt: expect.any(Date),
      }),
    );
  });

  it('should issue a certificate exactly once on completion', async () => {
    lectureProgressesService.findByEnrollmentId.mockResolvedValue([
      progress('a', 'completed'),
      progress('b', 'completed'),
      progress('d', 'completed'),
    ]);

    await service.recompute('enr-1');

    expect(certificateService.issueFor).toHaveBeenCalledWith('enr-1');
  });

  it('should not re-complete an already completed enrollment', async () => {
    enrollmentsService.findById.mockResolvedValue({
      ...enrollment,
      status: 'completed',
      completedAt: new Date('2026-01-01'),
    });
    lectureProgressesService.findByEnrollmentId.mockResolvedValue([
      progress('a', 'completed'),
      progress('b', 'completed'),
      progress('d', 'completed'),
    ]);

    await service.recompute('enr-1');

    expect(certificateService.issueFor).not.toHaveBeenCalled();
    const payload = enrollmentsService.update.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect('completedAt' in payload).toBe(false);
  });

  it('should promote enrolled to in_progress once anything is done', async () => {
    enrollmentsService.findById.mockResolvedValue({
      ...enrollment,
      status: 'enrolled',
    });
    lectureProgressesService.findByEnrollmentId.mockResolvedValue([
      progress('a', 'completed'),
    ]);

    const result = await service.recompute('enr-1');

    expect(result.enrollmentStatus).toBe('in_progress');
  });

  it('should leave a still-untouched enrollment as enrolled', async () => {
    enrollmentsService.findById.mockResolvedValue({
      ...enrollment,
      status: 'enrolled',
    });

    expect((await service.recompute('enr-1')).enrollmentStatus).toBe(
      'enrolled',
    );
  });

  it('should not let a certificate failure lose the progress write', async () => {
    certificateService.issueFor.mockRejectedValue(new Error('R2 down'));
    lectureProgressesService.findByEnrollmentId.mockResolvedValue([
      progress('a', 'completed'),
      progress('b', 'completed'),
      progress('d', 'completed'),
    ]);

    await expect(service.recompute('enr-1')).resolves.toMatchObject({
      progressPct: 100,
      enrollmentStatus: 'completed',
    });
  });

  /**
   * Epic 4.2 §2.4(b)(c) / D8 — once earned, completion is not taken back.
   *
   * `progressPct` may still fall: an admin adding a required lecture to a
   * published course legitimately drops it. The status, the completion date
   * and the certificate stand.
   */
  describe('completion is never withdrawn (BUG-01/BUG-02)', () => {
    const completed = {
      id: 'enr-1',
      status: 'completed',
      progressPct: 100,
      completedAt: new Date('2026-09-01'),
      course: { id: 'course-1' },
    };

    /** All three required lectures done. */
    const allDone = [
      progress('a', 'completed'),
      progress('b', 'completed'),
      progress('d', 'completed'),
    ];

    it('should keep the enrollment completed when a required lecture is added', async () => {
      enrollmentsService.findById.mockResolvedValue(completed);
      curriculumService.orderedLectures.mockResolvedValue([
        lec('a'),
        lec('b'),
        lec('d'),
        lec('e'),
      ]);
      lectureProgressesService.findByEnrollmentId.mockResolvedValue(allDone);

      const result = await service.recompute('enr-1');

      expect(result.enrollmentStatus).toBe('completed');
      expect(enrollmentsService.update).toHaveBeenCalledWith(
        'enr-1',
        expect.objectContaining({ status: 'completed' }),
      );
    });

    // The percentage stays honest even while the status holds.
    it('should still report the fallen percentage', async () => {
      enrollmentsService.findById.mockResolvedValue(completed);
      curriculumService.orderedLectures.mockResolvedValue([
        lec('a'),
        lec('b'),
        lec('d'),
        lec('e'),
      ]);
      lectureProgressesService.findByEnrollmentId.mockResolvedValue(allDone);

      expect((await service.recompute('enr-1')).progressPct).toBe(75);
    });

    it('should keep completion when a demotion leaves a lecture unfinished', async () => {
      enrollmentsService.findById.mockResolvedValue(completed);
      lectureProgressesService.findByEnrollmentId.mockResolvedValue([
        progress('a', 'completed'),
        progress('b', 'in_progress'),
        progress('d', 'completed'),
      ]);

      const result = await service.recompute('enr-1');

      expect(result.enrollmentStatus).toBe('completed');
    });

    it('should never restamp a completion date that already exists', async () => {
      enrollmentsService.findById.mockResolvedValue(completed);
      lectureProgressesService.findByEnrollmentId.mockResolvedValue(allDone);

      await service.recompute('enr-1');

      const [, payload] = enrollmentsService.update.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];

      expect(payload).not.toHaveProperty('completedAt');
    });

    /**
     * BUG-02 — `completedAt` used to be stamped whenever
     * `isCompleted && !wasCompleted`. After a demotion `wasCompleted` was
     * false, so re-completing wrote a *new* date while the certificate's
     * snapshot kept the old one, and the two then disagreed about when the
     * course was finished.
     */
    it('should stamp a completion date only when there is none', async () => {
      enrollmentsService.findById.mockResolvedValue({
        ...completed,
        status: 'in_progress',
        completedAt: null,
      });
      lectureProgressesService.findByEnrollmentId.mockResolvedValue(allDone);

      await service.recompute('enr-1');

      expect(enrollmentsService.update).toHaveBeenCalledWith(
        'enr-1',
        expect.objectContaining({ completedAt: expect.any(Date) }),
      );
    });

    it('should not restamp a date onto a row that already carries one', async () => {
      enrollmentsService.findById.mockResolvedValue({
        ...completed,
        status: 'in_progress',
        completedAt: new Date('2026-08-01'),
      });
      lectureProgressesService.findByEnrollmentId.mockResolvedValue(allDone);

      await service.recompute('enr-1');

      const [, payload] = enrollmentsService.update.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];

      expect(payload).not.toHaveProperty('completedAt');
    });

    it('should not re-issue a certificate for an already completed enrollment', async () => {
      enrollmentsService.findById.mockResolvedValue(completed);
      lectureProgressesService.findByEnrollmentId.mockResolvedValue(allDone);

      await service.recompute('enr-1');

      expect(certificateService.issueFor).not.toHaveBeenCalled();
    });
  });
});
