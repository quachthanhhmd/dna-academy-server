import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CompletionService } from './completion.service';

describe('CompletionService', () => {
  let service: CompletionService;
  let deps: Record<string, any>;

  const completedEnrollment = {
    id: 'enr-1',
    status: 'completed',
    completedAt: new Date('2026-06-01'),
    progressPct: 100,
    lastLecture: { id: 'lec-9' },
    student: { id: 7, fullName: 'Nguyễn Văn A' },
    course: {
      id: 'course-1',
      title: 'Intro',
      slug: 'intro',
      thumbnailUrl: 'https://cdn/t.png',
    },
  };

  beforeEach(() => {
    deps = {
      enrollmentsService: {
        findById: (jest.fn() as jest.Mock<any>).mockResolvedValue(
          completedEnrollment,
        ),
      },
      certificatesService: {
        findByEnrollmentId: (jest.fn() as jest.Mock<any>).mockResolvedValue(
          null,
        ),
      },
      certificateGenerator: {
        issueFor: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          id: 'cert-1',
          certificateNumber: 'DNA-2026-000001',
          studentNameSnapshot: 'Nguyễn Văn A',
          courseTitleSnapshot: 'Intro',
          completionDate: new Date('2026-06-01'),
          issuedAt: new Date('2026-06-01'),
        }),
      },
      courseRatingsService: {
        findByEnrollmentId: (jest.fn() as jest.Mock<any>).mockResolvedValue(
          null,
        ),
        create: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'r1' }),
        update: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'r1' }),
        averageForCourse: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          average: 4.5,
          count: 2,
        }),
      },
      coursesService: {
        update: (jest.fn() as jest.Mock<any>).mockResolvedValue({}),
      },
      courseGroupAssignmentsService: {
        findByCourseId: (jest.fn() as jest.Mock<any>).mockResolvedValue([
          { group: { id: 'grp-1', name: 'Data & AI', displayOrder: 2 } },
        ]),
      },
      configService: {
        getOrThrow: (jest.fn() as jest.Mock<any>).mockImplementation(
          (key: string) =>
            key === 'certificate.issuerName'
              ? 'DNA Learning Academy'
              : 'https://cdn.example.com/sig.png',
        ),
      },
    };

    service = new CompletionService(
      deps.enrollmentsService,
      deps.certificatesService,
      deps.certificateGenerator,
      deps.courseRatingsService,
      deps.coursesService,
      deps.configService,
      deps.courseGroupAssignmentsService,
    );
  });

  describe('getCertificate', () => {
    it('should report not ready while the course is unfinished', async () => {
      deps.enrollmentsService.findById.mockResolvedValue({
        ...completedEnrollment,
        status: 'in_progress',
      });

      // D6 — the course context is present on this branch too; only the
      // certificate itself is absent.
      await expect(service.getCertificate('enr-1', 7)).resolves.toMatchObject({
        ready: false,
        certificate: null,
      });
      expect(deps.certificateGenerator.issueFor).not.toHaveBeenCalled();
    });

    it('should issue on first read after completion', async () => {
      const result = await service.getCertificate('enr-1', 7);

      expect(result).toMatchObject({
        ready: true,
        certificate: expect.objectContaining({
          number: 'DNA-2026-000001',
          studentName: 'Nguyễn Văn A',
          courseTitle: 'Intro',
        }),
      });
    });

    it('should return the existing certificate without re-issuing', async () => {
      deps.certificatesService.findByEnrollmentId.mockResolvedValue({
        id: 'cert-1',
        certificateNumber: 'DNA-2026-000009',
        studentNameSnapshot: 'A',
        courseTitleSnapshot: 'B',
        completionDate: new Date(),
        issuedAt: new Date(),
      });

      const result = await service.getCertificate('enr-1', 7);

      expect(deps.certificateGenerator.issueFor).not.toHaveBeenCalled();
      expect(result.certificate?.number).toBe('DNA-2026-000009');
    });

    it("should refuse another student's certificate", async () => {
      await expect(service.getCertificate('enr-1', 999)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('upsertRating', () => {
    it('should create a rating and refresh the course average', async () => {
      await service.upsertRating('enr-1', 7, { rating: 5 });

      expect(deps.courseRatingsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 5, reviewStatus: 'approved' }),
      );
      expect(deps.coursesService.update).toHaveBeenCalledWith('course-1', {
        avgRating: 4.5,
      });
    });

    it('should hold a written review for moderation', async () => {
      await service.upsertRating('enr-1', 7, {
        rating: 4,
        reviewText: 'Great course',
      });

      expect(deps.courseRatingsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ reviewStatus: 'pending' }),
      );
    });

    it('should update the existing rating rather than adding a second', async () => {
      deps.courseRatingsService.findByEnrollmentId.mockResolvedValue({
        id: 'r1',
      });

      await service.upsertRating('enr-1', 7, { rating: 3 });

      expect(deps.courseRatingsService.update).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ rating: 3 }),
      );
      expect(deps.courseRatingsService.create).not.toHaveBeenCalled();
    });

    it('should refuse a rating before the course is completed', async () => {
      deps.enrollmentsService.findById.mockResolvedValue({
        ...completedEnrollment,
        status: 'in_progress',
      });

      await expect(
        service.upsertRating('enr-1', 7, { rating: 5 }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should round the stored average to the column scale', async () => {
      deps.courseRatingsService.averageForCourse.mockResolvedValue({
        average: 4.666666,
        count: 3,
      });

      await service.upsertRating('enr-1', 7, { rating: 5 });

      expect(deps.coursesService.update).toHaveBeenCalledWith('course-1', {
        avgRating: 4.67,
      });
    });
  });

  describe('certificate issuer', () => {
    it('should attach the issuer name and signature url', async () => {
      const result = await service.getCertificate('enr-1', 7);

      expect(result.certificate).toMatchObject({
        issuerName: 'DNA Learning Academy',
        signatureUrl: 'https://cdn.example.com/sig.png',
      });
    });

    it('should still expose the id the FE needs', async () => {
      const result = await service.getCertificate('enr-1', 7);

      expect(result.certificate?.id).toBe('cert-1');
    });

    it('should carry no certificate at all when the course is unfinished', async () => {
      deps.enrollmentsService.findById.mockResolvedValue({
        ...completedEnrollment,
        status: 'in_progress',
      });

      const result = await service.getCertificate('enr-1', 7);

      expect(result.certificate).toBeNull();
      expect(Object.keys(result).sort()).toEqual([
        'certificate',
        'course',
        'lastLectureId',
        'pathway',
        'progressPct',
        'ready',
      ]);
    });
  });

  /**
   * Epic 4.1 D6 — the course context sits at the response *root*, not inside
   * `certificate`, because the `ready: false` branch has no certificate object
   * and that is exactly the branch that needs the course, the progress and a
   * way back to the unfinished lecture.
   */
  describe('D6 course context', () => {
    it('should return the course at the root on the ready branch', async () => {
      const result = await service.getCertificate('enr-1', 7);

      expect(result).toMatchObject({
        ready: true,
        course: {
          id: 'course-1',
          slug: 'intro',
          title: 'Intro',
          thumbnailUrl: 'https://cdn/t.png',
        },
        progressPct: 100,
        lastLectureId: 'lec-9',
      });
    });

    // The whole reason the context is at the root rather than nested.
    it('should return the same context when the course is unfinished', async () => {
      deps.enrollmentsService.findById.mockResolvedValue({
        ...completedEnrollment,
        status: 'in_progress',
        progressPct: 62,
      });

      const result = await service.getCertificate('enr-1', 7);

      expect(result).toMatchObject({
        ready: false,
        certificate: null,
        progressPct: 62,
        lastLectureId: 'lec-9',
        course: { id: 'course-1', slug: 'intro' },
        pathway: { groupId: 'grp-1', name: 'Data & AI' },
      });
    });

    it('should carry no certificate object on the unfinished branch', async () => {
      deps.enrollmentsService.findById.mockResolvedValue({
        ...completedEnrollment,
        status: 'in_progress',
      });

      const result = await service.getCertificate('enr-1', 7);

      expect(result.certificate).toBeNull();
      expect(deps.certificateGenerator.issueFor).not.toHaveBeenCalled();
    });

    it('should report a null last lecture when the course was never started', async () => {
      deps.enrollmentsService.findById.mockResolvedValue({
        ...completedEnrollment,
        lastLecture: null,
      });

      expect(
        (await service.getCertificate('enr-1', 7)).lastLectureId,
      ).toBeNull();
    });

    it('should default a missing progressPct to 0 rather than undefined', async () => {
      deps.enrollmentsService.findById.mockResolvedValue({
        ...completedEnrollment,
        status: 'in_progress',
        progressPct: undefined,
      });

      expect((await service.getCertificate('enr-1', 7)).progressPct).toBe(0);
    });

    it('should keep the snapshot title distinct from the live course title', async () => {
      deps.certificatesService.findByEnrollmentId.mockResolvedValue({
        id: 'cert-1',
        certificateNumber: 'DNA-2026-000001',
        studentNameSnapshot: 'Nguyễn Văn A',
        courseTitleSnapshot: 'Intro (old title)',
        completionDate: new Date('2026-06-01'),
        issuedAt: new Date('2026-06-01'),
      });

      const result = await service.getCertificate('enr-1', 7);

      expect(result.certificate?.courseTitle).toBe('Intro (old title)');
      expect(result.course.title).toBe('Intro');
    });
  });

  describe('D6 pathway card', () => {
    it('should return the course group as the pathway', async () => {
      const result = await service.getCertificate('enr-1', 7);

      expect(result.pathway).toEqual({ groupId: 'grp-1', name: 'Data & AI' });
    });

    it('should return null when the course belongs to no group', async () => {
      deps.courseGroupAssignmentsService.findByCourseId.mockResolvedValue([]);

      expect((await service.getCertificate('enr-1', 7)).pathway).toBeNull();
    });

    // The card must not change between two identical requests, so the choice
    // is ordered rather than "whatever the database returned first".
    it('should pick the group with the lowest displayOrder', async () => {
      deps.courseGroupAssignmentsService.findByCourseId.mockResolvedValue([
        { group: { id: 'grp-9', name: 'Zoology', displayOrder: 9 } },
        { group: { id: 'grp-1', name: 'Data & AI', displayOrder: 1 } },
        { group: { id: 'grp-5', name: 'Biology', displayOrder: 5 } },
      ]);

      expect((await service.getCertificate('enr-1', 7)).pathway).toEqual({
        groupId: 'grp-1',
        name: 'Data & AI',
      });
    });

    it('should break a displayOrder tie by name', async () => {
      deps.courseGroupAssignmentsService.findByCourseId.mockResolvedValue([
        { group: { id: 'grp-b', name: 'Biology', displayOrder: 3 } },
        { group: { id: 'grp-a', name: 'Astronomy', displayOrder: 3 } },
      ]);

      expect((await service.getCertificate('enr-1', 7)).pathway).toEqual({
        groupId: 'grp-a',
        name: 'Astronomy',
      });
    });

    it('should ignore an assignment with no group rather than crashing', async () => {
      deps.courseGroupAssignmentsService.findByCourseId.mockResolvedValue([
        { group: null },
        { group: { id: 'grp-1', name: 'Data & AI', displayOrder: 2 } },
      ]);

      expect((await service.getCertificate('enr-1', 7)).pathway).toEqual({
        groupId: 'grp-1',
        name: 'Data & AI',
      });
    });
  });

  /**
   * D6's whole justification is that the context is free. If it stops being
   * free the decision stops being right, so the query count is asserted.
   */
  describe('D6 query cost', () => {
    it('should read the enrollment once', async () => {
      await service.getCertificate('enr-1', 7);

      expect(deps.enrollmentsService.findById).toHaveBeenCalledTimes(1);
    });

    it('should cost exactly one query for the pathway', async () => {
      await service.getCertificate('enr-1', 7);

      expect(
        deps.courseGroupAssignmentsService.findByCourseId,
      ).toHaveBeenCalledTimes(1);
      expect(
        deps.courseGroupAssignmentsService.findByCourseId,
      ).toHaveBeenCalledWith('course-1');
    });
  });

  /**
   * Epic 4.2 §2.4(d) / D8 — an issued certificate is never withdrawn.
   *
   * `ready` used to key on `enrollment.status === 'completed'` alone, so a
   * demoted enrollment hid a certificate the student had already earned and
   * whose number may already be public on the verification page.
   */
  describe('an issued certificate is never withdrawn (BUG-01)', () => {
    const issued = {
      id: 'cert-1',
      certificateNumber: 'DNA-2026-000118',
      studentNameSnapshot: 'Nguyễn Văn A',
      courseTitleSnapshot: 'Intro',
      completionDate: new Date('2026-06-01'),
      issuedAt: new Date('2026-06-01'),
    };

    it('should stay ready when a certificate exists but the enrollment is not completed', async () => {
      deps.enrollmentsService.findById.mockResolvedValue({
        ...completedEnrollment,
        status: 'in_progress',
        progressPct: 95,
      });
      deps.certificatesService.findByEnrollmentId.mockResolvedValue(issued);

      const result = await service.getCertificate('enr-1', 7);

      expect(result.ready).toBe(true);
      expect(result.certificate?.number).toBe('DNA-2026-000118');
    });

    it('should report the fallen percentage alongside the certificate', async () => {
      deps.enrollmentsService.findById.mockResolvedValue({
        ...completedEnrollment,
        status: 'in_progress',
        progressPct: 95,
      });
      deps.certificatesService.findByEnrollmentId.mockResolvedValue(issued);

      expect((await service.getCertificate('enr-1', 7)).progressPct).toBe(95);
    });

    // The mirror case must still hold: no certificate and not complete is a
    // genuine empty state, and must not mint one.
    it('should stay not-ready when there is no certificate and no completion', async () => {
      deps.enrollmentsService.findById.mockResolvedValue({
        ...completedEnrollment,
        status: 'in_progress',
      });
      deps.certificatesService.findByEnrollmentId.mockResolvedValue(null);

      const result = await service.getCertificate('enr-1', 7);

      expect(result.ready).toBe(false);
      expect(result.certificate).toBeNull();
      expect(deps.certificateGenerator.issueFor).not.toHaveBeenCalled();
    });

    it('should not issue a certificate for an unfinished course', async () => {
      deps.enrollmentsService.findById.mockResolvedValue({
        ...completedEnrollment,
        status: 'enrolled',
      });
      deps.certificatesService.findByEnrollmentId.mockResolvedValue(null);

      await service.getCertificate('enr-1', 7);

      expect(deps.certificateGenerator.issueFor).not.toHaveBeenCalled();
    });
  });
});
