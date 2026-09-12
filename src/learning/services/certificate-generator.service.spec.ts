import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CertificateGeneratorService } from './certificate-generator.service';

describe('CertificateGeneratorService', () => {
  let service: CertificateGeneratorService;
  let certificatesService: Record<string, jest.Mock<any>>;
  let enrollmentsService: Record<string, jest.Mock<any>>;
  let quizAttemptsService: Record<string, jest.Mock<any>>;

  const enrollment = {
    id: 'enr-1',
    status: 'completed',
    completedAt: new Date('2026-06-01T00:00:00.000Z'),
    student: { id: 7, fullName: 'Nguyễn Văn A' },
    course: { id: 'course-1', title: 'Intro' },
  };

  const existing = {
    id: 'cert-1',
    certificateNumber: 'DNA-2026-000001',
    studentNameSnapshot: 'Old Name',
    courseTitleSnapshot: 'Old Title',
    completionDate: new Date('2026-01-01T00:00:00.000Z'),
    issuedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    certificatesService = {
      findByEnrollmentId: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
      nextSequenceValue: (jest.fn() as jest.Mock<any>).mockResolvedValue(1),
      create: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'cert-1' }),
      // Spread the row the service actually loaded, not the outer fixture:
      // otherwise a field the service deliberately leaves untouched comes back
      // undefined and the assertion tests the mock instead of the code.
      update: (jest.fn() as jest.Mock<any>).mockImplementation(
        async (_id: unknown, patch: Record<string, unknown>) => ({
          ...existing,
          ...((await certificatesService.findByEnrollmentId()) ?? {}),
          ...patch,
        }),
      ),
    };
    enrollmentsService = {
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue(enrollment),
    };

    quizAttemptsService = {
      findSubmittedByEnrollmentIds: (
        jest.fn() as jest.Mock<any>
      ).mockResolvedValue([]),
    };

    service = new CertificateGeneratorService(
      certificatesService as never,
      enrollmentsService as never,
      quizAttemptsService as never,
    );
  });

  describe('formatNumber', () => {
    it('should zero-pad the sequence to six digits', () => {
      expect(CertificateGeneratorService.formatNumber(2026, 1)).toBe(
        'DNA-2026-000001',
      );
    });
  });

  describe('issueFor', () => {
    it('should take its number from the database sequence, not a row count', async () => {
      certificatesService.nextSequenceValue.mockResolvedValue(42);

      await service.issueFor('enr-1');

      expect(certificatesService.nextSequenceValue).toHaveBeenCalled();
      expect(certificatesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ certificateNumber: 'DNA-2026-000042' }),
      );
    });

    it('should mint a new certificate when none exists', async () => {
      await service.issueFor('enr-1');

      expect(certificatesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          certificateNumber: 'DNA-2026-000001',
          studentNameSnapshot: 'Nguyễn Văn A',
          courseTitleSnapshot: 'Intro',
        }),
      );
    });

    it('should be idempotent', async () => {
      certificatesService.findByEnrollmentId.mockResolvedValue(existing);

      await expect(service.issueFor('enr-1')).resolves.toBe(existing);
      expect(certificatesService.create).not.toHaveBeenCalled();
    });
  });

  describe('regenerateFor', () => {
    it('should refresh the snapshots while keeping the certificate number', async () => {
      certificatesService.findByEnrollmentId.mockResolvedValue(existing);

      const result = await service.regenerateFor('enr-1');

      expect(certificatesService.update).toHaveBeenCalledWith(
        'cert-1',
        expect.objectContaining({
          studentNameSnapshot: 'Nguyễn Văn A',
          courseTitleSnapshot: 'Intro',
          completionDate: enrollment.completedAt,
        }),
      );
      // The number is the certificate's public identity — regenerating a
      // rendering must never change it.
      expect(certificatesService.update).not.toHaveBeenCalledWith(
        'cert-1',
        expect.objectContaining({ certificateNumber: expect.anything() }),
      );
      expect(result.certificateNumber).toBe('DNA-2026-000001');
    });

    it('should mint one when the enrollment is complete but has no certificate', async () => {
      await service.regenerateFor('enr-1');

      expect(certificatesService.create).toHaveBeenCalled();
    });

    it('should refuse to regenerate for an incomplete enrollment', async () => {
      enrollmentsService.findById.mockResolvedValue({
        ...enrollment,
        status: 'in_progress',
        completedAt: null,
      });

      await expect(service.regenerateFor('enr-1')).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(certificatesService.create).not.toHaveBeenCalled();
      expect(certificatesService.update).not.toHaveBeenCalled();
    });

    it('should 404 an unknown enrollment', async () => {
      enrollmentsService.findById.mockResolvedValue(null);

      await expect(service.regenerateFor('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  /**
   * Epic 4.5 §1.5 (revised) — the grade is frozen onto the certificate.
   *
   * It used to be recomputed on every read, so retaking a quiz after finishing
   * a course changed the grade shown beside a certificate that had not moved.
   */
  describe('frozen final grade', () => {
    const attempt = (score: number) => ({
      enrollment: { id: 'enr-1' },
      score,
      submittedAt: new Date(),
    });

    it('should store the best submitted score at issue time', async () => {
      quizAttemptsService.findSubmittedByEnrollmentIds.mockResolvedValue([
        attempt(71),
        attempt(96),
        attempt(40),
      ]);

      await service.issueFor('enr-1');

      expect(certificatesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ finalGradePct: 96 }),
      );
    });

    it('should store null when the student submitted no quiz', async () => {
      await service.issueFor('enr-1');

      expect(certificatesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ finalGradePct: null }),
      );
    });

    it('should ignore an attempt with no score', async () => {
      quizAttemptsService.findSubmittedByEnrollmentIds.mockResolvedValue([
        { enrollment: { id: 'enr-1' }, score: null, submittedAt: new Date() },
        attempt(60),
      ]);

      await service.issueFor('enr-1');

      expect(certificatesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ finalGradePct: 60 }),
      );
    });

    it('should not recompute the grade for a certificate that already exists', async () => {
      certificatesService.findByEnrollmentId.mockResolvedValue({
        ...existing,
        finalGradePct: 80,
      });
      quizAttemptsService.findSubmittedByEnrollmentIds.mockResolvedValue([
        attempt(100),
      ]);

      const result = await service.issueFor('enr-1');

      expect(result.finalGradePct).toBe(80);
      expect(certificatesService.create).not.toHaveBeenCalled();
      expect(
        quizAttemptsService.findSubmittedByEnrollmentIds,
      ).not.toHaveBeenCalled();
    });

    /**
     * The point of the change: "frozen … regardless of learning". Regenerate
     * refreshes the name, the title and the date — a correction to who the
     * certificate is for. The grade is what was earned, and re-earning it
     * later does not rewrite the record.
     */
    it('should leave the grade alone on a regenerate', async () => {
      certificatesService.findByEnrollmentId.mockResolvedValue({
        ...existing,
        finalGradePct: 72,
      });
      quizAttemptsService.findSubmittedByEnrollmentIds.mockResolvedValue([
        attempt(100),
      ]);

      await service.regenerateFor('enr-1');

      const [, patch] = certificatesService.update.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];

      expect(patch).not.toHaveProperty('finalGradePct');
      expect(
        quizAttemptsService.findSubmittedByEnrollmentIds,
      ).not.toHaveBeenCalled();
    });

    it('should still refresh the snapshots a regenerate exists to fix', async () => {
      certificatesService.findByEnrollmentId.mockResolvedValue({
        ...existing,
        finalGradePct: 72,
      });

      const result = await service.regenerateFor('enr-1');

      expect(result.studentNameSnapshot).toBe('Nguyễn Văn A');
      expect(result.courseTitleSnapshot).toBe('Intro');
      expect(result.finalGradePct).toBe(72);
    });
  });
});
