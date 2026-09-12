import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { CourseEnrollmentService } from './course-enrollment.service';

/**
 * Epic 4.5 — `GET /students/me/courses`, the My Learning dashboard.
 *
 * The contract is §1.2 (envelope, filtering, ordering, paging), §1.3 (card
 * fields), §1.4 (`continueLecture`) and §1.5 (grade).
 */
describe('CourseEnrollmentService — my courses (Epic 4.5)', () => {
  let service: CourseEnrollmentService;
  let deps: Record<string, Record<string, jest.Mock<any>>>;

  const course = (overrides: Record<string, unknown> = {}) => ({
    id: 'course-1',
    title: 'Intro',
    slug: 'intro',
    thumbnailUrl: 'https://cdn/t.png',
    language: 'vi',
    totalLectures: 3,
    totalDurationSecs: 3600,
    hasCertificate: true,
    status: 'published',
    ...overrides,
  });

  const enrollment = (overrides: Record<string, unknown> = {}) => ({
    id: 'enr-1',
    status: 'in_progress',
    progressPct: 40,
    enrollmentDate: new Date('2026-01-05'),
    completedAt: null,
    lastAccessedAt: new Date('2026-02-01'),
    lastLecture: { id: 'lec-1', title: 'Lecture One' },
    course: course(),
    ...overrides,
  });

  /** Three lectures in course reading order, 600s each. */
  const lectures = [
    {
      id: 'lec-1',
      title: 'Lecture One',
      durationSecs: 600,
      sectionTitle: 'M1',
    },
    {
      id: 'lec-2',
      title: 'Lecture Two',
      durationSecs: 600,
      sectionTitle: 'M1',
    },
    {
      id: 'lec-3',
      title: 'Lecture Three',
      durationSecs: 600,
      sectionTitle: 'M2',
    },
  ];

  const progress = (
    lectureId: string,
    status: string,
    enrollmentId = 'enr-1',
  ) => ({
    enrollment: { id: enrollmentId },
    lecture: { id: lectureId },
    status,
  });

  beforeEach(() => {
    deps = {
      coursesService: {
        findBySlug: jest.fn() as jest.Mock<any>,
        update: jest.fn() as jest.Mock<any>,
      },
      enrollmentsService: {
        findByStudentAndCourse: jest.fn() as jest.Mock<any>,
        findByStudentId: (jest.fn() as jest.Mock<any>).mockResolvedValue([
          enrollment(),
        ]),
        create: jest.fn() as jest.Mock<any>,
      },
      certificatesService: {
        findByEnrollmentId: (jest.fn() as jest.Mock<any>).mockResolvedValue(
          null,
        ),
        findByEnrollmentIds: (jest.fn() as jest.Mock<any>).mockResolvedValue(
          [],
        ),
      },
      lectureProgressesService: {
        findByEnrollmentIds: (jest.fn() as jest.Mock<any>).mockResolvedValue(
          [],
        ),
      },
      lecturesService: {
        findOrderedByCourseIds: (jest.fn() as jest.Mock<any>).mockResolvedValue(
          new Map([['course-1', lectures]]),
        ),
      },
      courseGroupAssignmentsService: {
        findPrimaryGroupByCourseIds: (
          jest.fn() as jest.Mock<any>
        ).mockResolvedValue(new Map()),
      },
    };

    service = new CourseEnrollmentService(
      deps.coursesService as never,
      deps.enrollmentsService as never,
      deps.certificatesService as never,
      deps.lectureProgressesService as never,
      deps.lecturesService as never,
      deps.courseGroupAssignmentsService as never,
    );
  });

  const list = (query: Record<string, unknown> = {}) =>
    service.findMyCourses(7, query as never);

  describe('envelope (§1.2)', () => {
    it('should return data, counts and paging rather than a bare array', async () => {
      const result = await list();

      expect(Array.isArray(result)).toBe(false);
      expect(result).toMatchObject({
        totalCount: 1,
        page: 1,
        limit: 6,
        hasNextPage: false,
      });
      expect(result.data).toHaveLength(1);
    });

    /**
     * The one place the draft contradicted itself: D3 filters server-side
     * while AC-2 wants all three tab counters. A page narrowed to
     * `in_progress` cannot know how many `completed` rows exist, so `counts`
     * must describe the unfiltered set.
     */
    it('should keep counts unfiltered when a status filter is applied', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue([
        enrollment({ id: 'a', status: 'in_progress' }),
        enrollment({ id: 'b', status: 'in_progress' }),
        enrollment({ id: 'c', status: 'completed' }),
        enrollment({ id: 'd', status: 'cancelled' }),
        enrollment({ id: 'e', status: 'enrolled' }),
      ]);

      const filtered = await list({ status: 'completed' });

      expect(filtered.counts).toEqual({ all: 5, inProgress: 2, completed: 1 });
      // totalCount describes the FILTERED set, and drives pagination.
      expect(filtered.totalCount).toBe(1);
      expect(filtered.data).toHaveLength(1);
    });

    it('should equal counts.all in totalCount when no status is given', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue([
        enrollment({ id: 'a', status: 'in_progress' }),
        enrollment({ id: 'b', status: 'completed' }),
      ]);

      const result = await list();

      expect(result.totalCount).toBe(result.counts.all);
    });

    // §1.2 — cancelled rows are part of `all` and never match a tab.
    it('should include cancelled rows in all but in neither tab', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue([
        enrollment({ id: 'a', status: 'cancelled' }),
      ]);

      const all = await list();
      const inProgress = await list({ status: 'in_progress' });
      const completed = await list({ status: 'completed' });

      expect(all.counts).toEqual({ all: 1, inProgress: 0, completed: 0 });
      expect(all.data).toHaveLength(1);
      expect(inProgress.data).toHaveLength(0);
      expect(completed.data).toHaveLength(0);
    });
  });

  describe('paging (§1.2)', () => {
    const many = (count: number) =>
      Array.from({ length: count }, (_, i) =>
        enrollment({
          id: `enr-${i}`,
          status: 'in_progress',
          lastAccessedAt: new Date(2026, 0, count - i),
        }),
      );

    it('should default to a page of six', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue(many(10));

      const result = await list();

      expect(result.data).toHaveLength(6);
      expect(result.hasNextPage).toBe(true);
    });

    it('should not repeat a row between page one and page two', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue(many(10));

      const first = await list({ page: 1 });
      const second = await list({ page: 2 });

      const firstIds = first.data.map((card) => card.enrollmentId);
      const secondIds = second.data.map((card) => card.enrollmentId);

      expect(second.data).toHaveLength(4);
      expect(second.hasNextPage).toBe(false);
      expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
    });

    it('should honour an explicit limit', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue(many(10));

      expect((await list({ limit: 3 })).data).toHaveLength(3);
    });

    it('should return an empty page past the end rather than failing', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue(many(2));

      const result = await list({ page: 9 });

      expect(result.data).toEqual([]);
      expect(result.hasNextPage).toBe(false);
      expect(result.totalCount).toBe(2);
    });
  });

  describe('ordering (§1.2)', () => {
    it('should put in_progress above completed regardless of recency', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue([
        enrollment({
          id: 'done',
          status: 'completed',
          completedAt: new Date('2026-09-09'),
        }),
        enrollment({
          id: 'active',
          status: 'in_progress',
          lastAccessedAt: new Date('2026-01-01'),
        }),
      ]);

      const result = await list();

      expect(result.data.map((card) => card.enrollmentId)).toEqual([
        'active',
        'done',
      ]);
    });

    it('should order in_progress by lastAccessedAt, newest first', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue([
        enrollment({ id: 'older', lastAccessedAt: new Date('2026-01-01') }),
        enrollment({ id: 'newer', lastAccessedAt: new Date('2026-09-01') }),
      ]);

      expect((await list()).data.map((c) => c.enrollmentId)).toEqual([
        'newer',
        'older',
      ]);
    });

    // NULLS LAST — a row never opened sorts below one that was.
    it('should sort a never-accessed in_progress row last within its group', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue([
        enrollment({ id: 'never', lastAccessedAt: null }),
        enrollment({ id: 'opened', lastAccessedAt: new Date('2026-01-01') }),
      ]);

      expect((await list()).data.map((c) => c.enrollmentId)).toEqual([
        'opened',
        'never',
      ]);
    });

    it('should order the four status groups per the spec', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue([
        enrollment({ id: 'cancelled', status: 'cancelled' }),
        enrollment({ id: 'completed', status: 'completed' }),
        enrollment({ id: 'enrolled', status: 'enrolled' }),
        enrollment({ id: 'active', status: 'in_progress' }),
      ]);

      expect((await list()).data.map((c) => c.enrollmentId)).toEqual([
        'active',
        'enrolled',
        'completed',
        'cancelled',
      ]);
    });

    /**
     * Without the id tiebreak, two rows with equal sort keys can swap between
     * requests, which makes a paginated list repeat or skip a card.
     */
    it('should break a tie by enrollment id so paging is stable', async () => {
      const same = new Date('2026-05-05');

      deps.enrollmentsService.findByStudentId.mockResolvedValue([
        enrollment({ id: 'b', lastAccessedAt: same }),
        enrollment({ id: 'a', lastAccessedAt: same }),
        enrollment({ id: 'c', lastAccessedAt: same }),
      ]);

      expect((await list()).data.map((c) => c.enrollmentId)).toEqual([
        'a',
        'b',
        'c',
      ]);
    });
  });

  /**
   * §1.4 — one field serving both the Continue button and the "Next: …" line,
   * because they are the same lecture and must never disagree.
   */
  describe('continueLecture (§1.4)', () => {
    it('should resume the last lecture when it is still in progress', async () => {
      deps.lectureProgressesService.findByEnrollmentIds.mockResolvedValue([
        progress('lec-1', 'in_progress'),
      ]);

      const [card] = (await list()).data;

      expect(card.continueLecture).toEqual({
        id: 'lec-1',
        title: 'Lecture One',
        sectionTitle: 'M1',
      });
    });

    // Step 2 — the regression the draft would have introduced by redefining
    // lastLecture: after reviewing a finished lecture, Continue must move on.
    it('should skip to the next unfinished lecture when the last one is complete', async () => {
      deps.lectureProgressesService.findByEnrollmentIds.mockResolvedValue([
        progress('lec-1', 'completed'),
      ]);

      const [card] = (await list()).data;

      expect(card.continueLecture?.id).toBe('lec-2');
      // …and lastLecture still remembers what was actually opened.
      expect(card.lastLectureId).toBe('lec-1');
      expect(card.lastLectureTitle).toBe('Lecture One');
    });

    it('should start at the first lecture when nothing has been opened', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue([
        enrollment({ status: 'enrolled', progressPct: 0, lastLecture: null }),
      ]);

      const [card] = (await list()).data;

      expect(card.continueLecture?.id).toBe('lec-1');
      expect(card.remainingDurationSecs).toBe(1800);
    });

    it('should be null with zero remaining time once every lecture is done', async () => {
      deps.lectureProgressesService.findByEnrollmentIds.mockResolvedValue([
        progress('lec-1', 'completed'),
        progress('lec-2', 'completed'),
        progress('lec-3', 'completed'),
      ]);

      const [card] = (await list()).data;

      expect(card.continueLecture).toBeNull();
      expect(card.remainingDurationSecs).toBe(0);
      expect(card.completedLectureCount).toBe(3);
    });

    it('should sum only the unfinished lectures into remainingDurationSecs', async () => {
      deps.lectureProgressesService.findByEnrollmentIds.mockResolvedValue([
        progress('lec-1', 'completed'),
      ]);

      const [card] = (await list()).data;

      expect(card.remainingDurationSecs).toBe(1200);
      expect(card.completedLectureCount).toBe(1);
    });

    it('should not leak another enrollment progress into this card', async () => {
      deps.lectureProgressesService.findByEnrollmentIds.mockResolvedValue([
        progress('lec-1', 'completed', 'someone-else'),
      ]);

      const [card] = (await list()).data;

      expect(card.completedLectureCount).toBe(0);
      expect(card.continueLecture?.id).toBe('lec-1');
    });

    it('should be null when the course has no lectures at all', async () => {
      deps.lecturesService.findOrderedByCourseIds.mockResolvedValue(
        new Map([['course-1', []]]),
      );

      const [card] = (await list()).data;

      expect(card.continueLecture).toBeNull();
      expect(card.remainingDurationSecs).toBe(0);
    });
  });

  describe('grade (§1.5)', () => {
    const completed = () =>
      deps.enrollmentsService.findByStudentId.mockResolvedValue([
        enrollment({
          status: 'completed',
          completedAt: new Date('2026-03-01'),
        }),
      ]);

    /** Epic 4.5 §1.5 — the grade lives on the certificate now. */
    const withCertificate = (finalGradePct: number | null = null) =>
      deps.certificatesService.findByEnrollmentIds.mockResolvedValue([
        {
          id: 'cert-1',
          certificateNumber: 'DNA-2026-000118',
          issuedAt: new Date('2026-03-01'),
          finalGradePct,
          enrollment: { id: 'enr-1' },
        },
      ]);

    it('should read the frozen grade off the certificate', async () => {
      completed();
      withCertificate(96);

      const [card] = (await list()).data;

      expect(card.certificate).toMatchObject({
        number: 'DNA-2026-000118',
        finalGradePct: 96,
        gradeLabel: 'A+',
      });
    });

    // D1 — no attempts means no grade row, not 0%.
    it('should leave both grade fields null when nothing was submitted', async () => {
      completed();
      withCertificate();

      const [card] = (await list()).data;

      expect(card.certificate).toMatchObject({
        finalGradePct: null,
        gradeLabel: null,
      });
    });

    it.each([
      [95, 'A+'],
      [94, 'A'],
    ])('should place %i at the boundary as %s', async (score, label) => {
      completed();
      withCertificate(score);

      const [card] = (await list()).data;

      expect(card.certificate?.gradeLabel).toBe(label);
    });

    /**
     * The property this revision exists for: the grade is what was earned at
     * issue time. Retaking a quiz afterwards changes nothing on the card,
     * because nothing on the card is recomputed from attempts any more.
     */
    it('should not move when the student keeps learning', async () => {
      completed();
      withCertificate(72);

      const before = (await list()).data[0];

      // Whatever happens to quiz attempts from here on, the card reads the
      // frozen value — the service no longer looks at attempts at all.
      const after = (await list()).data[0];

      expect(before.certificate?.finalGradePct).toBe(72);
      expect(after.certificate?.finalGradePct).toBe(72);
      expect(after.certificate?.gradeLabel).toBe('C');
    });

    it('should carry no certificate object while the course is unfinished', async () => {
      const [card] = (await list()).data;

      expect(card.certificate).toBeNull();
      expect(card.certificateId).toBeNull();
    });

    it('should keep certificateId in step with the certificate object', async () => {
      completed();
      withCertificate();

      const [card] = (await list()).data;

      expect(card.certificateId).toBe('cert-1');
      expect(card.certificate?.number).toBe('DNA-2026-000118');
    });

    /**
     * Epic 4.2 BUG-07's reset deletes quiz attempts but keeps the certificate,
     * so a card can legitimately show a certificate with no grade. Correct per
     * D1, and asserted here so it is not filed as a bug later.
     */
    it('should show a certificate with no grade when none was frozen', async () => {
      completed();
      withCertificate(null);

      const [card] = (await list()).data;

      expect(card.certificate?.number).toBe('DNA-2026-000118');
      expect(card.certificate?.finalGradePct).toBeNull();
    });
  });

  describe('card fields (§1.3)', () => {
    it('should carry the new course fields', async () => {
      deps.courseGroupAssignmentsService.findPrimaryGroupByCourseIds.mockResolvedValue(
        new Map([['course-1', { id: 'grp-1', name: 'Data Science' }]]),
      );

      const [card] = (await list()).data;

      expect(card.course).toMatchObject({
        language: 'vi',
        totalLectures: 3,
        totalDurationSecs: 3600,
        courseGroup: { id: 'grp-1', name: 'Data Science' },
      });
    });

    it('should carry a null course group when the course has none', async () => {
      const [card] = (await list()).data;

      expect(card.course.courseGroup).toBeNull();
    });

    it('should keep the fields existing callers already read', async () => {
      const [card] = (await list()).data;

      expect(card).toMatchObject({
        courseThumbnailUrl: 'https://cdn/t.png',
        hasCertificate: true,
        isArchived: false,
        progressPct: 40,
        status: 'in_progress',
      });
    });

    it('should mark a card archived when the course was unpublished', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue([
        enrollment({ course: course({ status: 'unpublished' }) }),
      ]);

      const result = await list();

      // AC-14 — the enrollment is retained, only the CTA changes client-side.
      expect(result.data).toHaveLength(1);
      expect(result.data[0].isArchived).toBe(true);
    });
  });

  /**
   * AC-16 / BE-1 — what makes the batching verifiable rather than aspirational.
   * A page of six must not issue a lookup per card.
   */
  describe('query cost (AC-16)', () => {
    beforeEach(() => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue(
        Array.from({ length: 6 }, (_, i) =>
          enrollment({ id: `enr-${i}`, status: 'completed' }),
        ),
      );
    });

    it('should batch every per-card lookup into one call', async () => {
      await list();

      for (const [service, method] of [
        ['lectureProgressesService', 'findByEnrollmentIds'],
        ['certificatesService', 'findByEnrollmentIds'],
        ['lecturesService', 'findOrderedByCourseIds'],
        ['courseGroupAssignmentsService', 'findPrimaryGroupByCourseIds'],
      ] as const) {
        expect(deps[service][method]).toHaveBeenCalledTimes(1);
      }
    });

    it('should never fall back to the per-row certificate lookup', async () => {
      await list();

      expect(
        deps.certificatesService.findByEnrollmentId,
      ).not.toHaveBeenCalled();
    });

    it('should batch only the page, not the whole enrollment set', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) =>
          enrollment({ id: `enr-${i}`, status: 'completed' }),
        ),
      );

      await list({ limit: 3 });

      const [ids] =
        deps.lectureProgressesService.findByEnrollmentIds.mock.calls[0];

      expect(ids).toHaveLength(3);
    });

    it('should issue no batch queries at all for a student with nothing', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue([]);

      const result = await list();

      expect(result.data).toEqual([]);
      expect(result.counts).toEqual({ all: 0, inProgress: 0, completed: 0 });
    });
  });

  describe('stats (§1.6)', () => {
    it('should aggregate over every enrollment, not a page', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue([
        enrollment({ id: 'a' }),
        enrollment({ id: 'b', course: course({ id: 'course-2' }) }),
      ]);
      deps.lecturesService.findOrderedByCourseIds.mockResolvedValue(
        new Map([
          ['course-1', lectures],
          ['course-2', lectures],
        ]),
      );
      deps.lectureProgressesService.findByEnrollmentIds.mockResolvedValue([
        progress('lec-1', 'completed', 'a'),
        progress('lec-2', 'completed', 'a'),
        progress('lec-1', 'completed', 'b'),
      ]);
      deps.certificatesService.findByEnrollmentIds.mockResolvedValue([
        { id: 'c1', enrollment: { id: 'a' } },
      ]);

      const stats = await service.findMyStats(7);

      expect(stats).toEqual({
        lecturesCompleted: 3,
        // 3 x 600s = 1800s = 0.5h
        totalStudyHours: 0.5,
        certificatesCount: 1,
      });
    });

    it('should round study hours to one decimal', async () => {
      deps.lecturesService.findOrderedByCourseIds.mockResolvedValue(
        new Map([['course-1', [{ ...lectures[0], durationSecs: 1000 }]]]),
      );
      deps.lectureProgressesService.findByEnrollmentIds.mockResolvedValue([
        progress('lec-1', 'completed'),
      ]);

      // 1000 / 3600 = 0.2777… → 0.3
      expect((await service.findMyStats(7)).totalStudyHours).toBe(0.3);
    });

    it('should return zeroes for a student with no enrollments', async () => {
      deps.enrollmentsService.findByStudentId.mockResolvedValue([]);

      expect(await service.findMyStats(7)).toEqual({
        lecturesCompleted: 0,
        totalStudyHours: 0,
        certificatesCount: 0,
      });
    });

    // D2 — deterministic on lecture durations, deliberately not watch time.
    it('should ignore watchDurationSecs entirely', async () => {
      deps.lectureProgressesService.findByEnrollmentIds.mockResolvedValue([
        { ...progress('lec-1', 'completed'), watchDurationSecs: 999999 },
      ]);

      expect((await service.findMyStats(7)).totalStudyHours).toBe(0.2);
    });
  });
});
