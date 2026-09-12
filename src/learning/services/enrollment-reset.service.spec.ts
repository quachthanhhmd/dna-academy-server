import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { EnrollmentResetService } from './enrollment-reset.service';

/**
 * Epic 4.2 §3.2 — BUG-07. One enrollment per (student, course) is enforced by
 * a unique index and nothing clears progress, so every learning scenario was a
 * one-shot: QA had to mint a new account or a new course for each run.
 */
describe('EnrollmentResetService', () => {
  let service: EnrollmentResetService;
  let deps: Record<string, any>;

  const resolved = (jest.fn() as jest.Mock<any>).mockResolvedValue(undefined);

  beforeEach(() => {
    deps = {
      enrollmentsService: {
        findById: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          id: 'enr-1',
          status: 'completed',
          student: { id: 7 },
          course: { id: 'course-1' },
        }),
        update: (jest.fn() as jest.Mock<any>).mockResolvedValue({}),
      },
      lectureProgressesService: { removeByEnrollmentId: resolved.mockClear() },
      quizAttemptAnswersService: {
        removeByEnrollmentId: jest.fn() as jest.Mock<any>,
      },
      quizAttemptsService: {
        removeByEnrollmentId: jest.fn() as jest.Mock<any>,
      },
      quizSavesService: { removeByEnrollmentId: jest.fn() as jest.Mock<any> },
      reflectionResponsesService: {
        removeByEnrollmentId: jest.fn() as jest.Mock<any>,
      },
      careerReflectionAnswersService: {
        removeByEnrollmentId: jest.fn() as jest.Mock<any>,
      },
      certificatesService: {
        findByEnrollmentId: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          id: 'cert-1',
          certificateNumber: 'DNA-2026-000118',
        }),
      },
    };

    for (const key of [
      'lectureProgressesService',
      'quizAttemptAnswersService',
      'quizAttemptsService',
      'quizSavesService',
      'reflectionResponsesService',
      'careerReflectionAnswersService',
    ]) {
      deps[key].removeByEnrollmentId = (
        jest.fn() as jest.Mock<any>
      ).mockResolvedValue(undefined);
    }

    service = new EnrollmentResetService(
      deps.enrollmentsService,
      deps.lectureProgressesService,
      deps.quizAttemptAnswersService,
      deps.quizAttemptsService,
      deps.quizSavesService,
      deps.reflectionResponsesService,
      deps.careerReflectionAnswersService,
      deps.certificatesService,
    );
  });

  it('should clear every table that holds the student work', async () => {
    await service.resetProgress('enr-1', 1);

    for (const key of [
      'lectureProgressesService',
      'quizAttemptAnswersService',
      'quizAttemptsService',
      'quizSavesService',
      'reflectionResponsesService',
      'careerReflectionAnswersService',
    ]) {
      expect(deps[key].removeByEnrollmentId).toHaveBeenCalledWith('enr-1');
    }
  });

  // An answer points at an attempt, so deleting attempts first would either
  // orphan the answers or trip the foreign key.
  it('should delete answers before the attempts they belong to', async () => {
    await service.resetProgress('enr-1', 1);

    const answersAt =
      deps.quizAttemptAnswersService.removeByEnrollmentId.mock
        .invocationCallOrder[0];
    const attemptsAt =
      deps.quizAttemptsService.removeByEnrollmentId.mock.invocationCallOrder[0];

    expect(answersAt).toBeLessThan(attemptsAt);
  });

  it('should put the enrollment back to its just-enrolled state', async () => {
    await service.resetProgress('enr-1', 1);

    expect(deps.enrollmentsService.update).toHaveBeenCalledWith('enr-1', {
      status: 'enrolled',
      progressPct: 0,
      startedAt: null,
      completedAt: null,
      lastLecture: null,
    });
  });

  /**
   * The certificate number may already be public on the verification page, and
   * `issueFor` is idempotent per enrollment — so re-completing the course hands
   * back the same number. Destroying a certificate is a separate, deliberate
   * act and is out of scope here.
   */
  it('should not delete the certificate', async () => {
    await service.resetProgress('enr-1', 1);

    expect(deps.certificatesService).not.toHaveProperty('remove');
  });

  it('should report the certificate that survived the reset', async () => {
    const result = await service.resetProgress('enr-1', 1);

    expect(result).toMatchObject({
      enrollmentId: 'enr-1',
      certificateRetained: 'DNA-2026-000118',
    });
  });

  it('should report no certificate when the student never earned one', async () => {
    deps.certificatesService.findByEnrollmentId.mockResolvedValue(null);

    const result = await service.resetProgress('enr-1', 1);

    expect(result.certificateRetained).toBeNull();
  });

  it('should 404 an enrollment that does not exist', async () => {
    deps.enrollmentsService.findById.mockResolvedValue(null);

    await expect(service.resetProgress('ghost', 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(
      deps.lectureProgressesService.removeByEnrollmentId,
    ).not.toHaveBeenCalled();
  });
});
