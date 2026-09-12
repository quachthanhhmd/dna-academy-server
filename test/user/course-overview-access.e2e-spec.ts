import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin, makeSuperAdmin } from '../utils/admin';
import { completeOnboarding } from '../utils/onboarding';

type Lecture = {
  id: string;
  isPreview: boolean;
  isLocked: boolean;
  lockReason: string | null;
  requiredLectureId: string | null;
  progressStatus: string | null;
  watchDurationSecs: number | null;
};

/**
 * Epic 4.3 §2.2 — `GET /courses/:slug` is the same URL for a guest and for an
 * enrolled student, and returns a different curriculum for each. That optional
 * auth is the part most likely to regress silently, because both answers are
 * valid-looking JSON.
 *
 * Two courses on purpose: one sequential, one not. The guest answer must be
 * identical across both, and the non-sequential one is the case that had never
 * been checked.
 */
describe('Epic 4.3 — course overview access matrix', () => {
  const app = APP_URL;
  const runId = Date.now();

  let adminToken: string;
  let studentToken: string;

  let seqSlug: string;
  let flatSlug: string;
  let seqLectureAId: string;

  const registerAndLogin = async (email: string) => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({
        email,
        password: 'secret',
        firstName: 'Access',
        lastName: 'Test',
      })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password: 'secret' })
      .expect(200);

    await completeOnboarding(app, body.token);

    return { token: body.token as string, userId: body.user.id as number };
  };

  /** A two-lecture course: the first a free preview, the second not. */
  const makeCourse = async (
    label: string,
    requiresSequentialCompletion: boolean,
  ) => {
    // Publishing requires a level and a category, so each course brings its
    // own rather than depending on whatever master data happens to exist.
    const { body: level } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_level/codes')
      .auth(adminToken, { type: 'bearer' })
      .send({
        code: `e43_lvl_${label}_${runId}`,
        name: `Level ${label} ${runId}`,
      })
      .expect(201);
    const { body: category } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_category/codes')
      .auth(adminToken, { type: 'bearer' })
      .send({
        code: `e43_cat_${label}_${runId}`,
        name: `Category ${label} ${runId}`,
      })
      .expect(201);

    const { body: instructor } = await request(app)
      .post('/api/v1/admin/instructors')
      .auth(adminToken, { type: 'bearer' })
      .send({ fullName: `Access Instructor ${label} ${runId}` })
      .expect(201);

    const { body: course } = await request(app)
      .post('/api/v1/admin/courses')
      .auth(adminToken, { type: 'bearer' })
      .send({
        courseId: `E43-${label}-${runId}`,
        title: `Access ${label} ${runId}`,
        language: 'vi',
        price: 0,
        hasCertificate: true,
        enrollmentOpen: true,
        primaryInstructorId: instructor.id,
      })
      .expect(201);

    await request(app)
      .patch(`/api/v1/admin/courses/${course.id}`)
      .auth(adminToken, { type: 'bearer' })
      .send({
        shortDescription: 'Short',
        thumbnailUrl: 'https://example.com/t.png',
        levelId: level.id,
        categoryId: category.id,
        requiresSequentialCompletion,
      })
      .expect(200);

    const { body: section } = await request(app)
      .post(`/api/v1/admin/courses/${course.id}/sections`)
      .auth(adminToken, { type: 'bearer' })
      .send({ title: 'Section', displayOrder: 1 })
      .expect(201);

    const lectureIds: string[] = [];

    for (const displayOrder of [1, 2]) {
      const { body: lecture } = await request(app)
        .post(
          `/api/v1/admin/courses/${course.id}/sections/${section.id}/lectures`,
        )
        .auth(adminToken, { type: 'bearer' })
        .send({
          title: `Lecture ${displayOrder}`,
          lectureType: 'article',
          displayOrder,
          durationSecs: 60,
          isPreview: displayOrder === 1,
          requiresCompletion: true,
        })
        .expect(201);

      await request(app)
        .patch(`/api/v1/admin/lectures/${lecture.id}/content`)
        .auth(adminToken, { type: 'bearer' })
        .send({ lectureType: 'article', body: '<p>Body</p>' })
        .expect(200);

      lectureIds.push(lecture.id);
    }

    await request(app)
      .post(`/api/v1/admin/courses/${course.id}/publish`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);

    const { body: detail } = await request(app)
      .get(`/api/v1/admin/courses/${course.id}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);

    return { slug: detail.slug as string, lectureIds };
  };

  const curriculum = async (
    slug: string,
    token?: string,
  ): Promise<Lecture[]> => {
    const call = request(app).get(`/api/v1/courses/${slug}`);

    if (token) {
      call.auth(token, { type: 'bearer' });
    }

    const { body } = await call.expect(200);

    return body.curriculum.flatMap((section) => section.lectures);
  };

  beforeAll(async () => {
    const seeded = await loginSeededSuperAdmin(app);

    const admin = await registerAndLogin(`e43.admin.${runId}@example.com`);
    await makeSuperAdmin(app, seeded, admin.userId);
    adminToken = (
      await request(app)
        .post('/api/v1/auth/email/login')
        .send({ email: `e43.admin.${runId}@example.com`, password: 'secret' })
        .expect(200)
    ).body.token;

    studentToken = (await registerAndLogin(`e43.student.${runId}@example.com`))
      .token;

    const sequential = await makeCourse('seq', true);
    seqSlug = sequential.slug;
    seqLectureAId = sequential.lectureIds[0];

    flatSlug = (await makeCourse('flat', false)).slug;
  }, 180000);

  describe('guest', () => {
    /**
     * The regression this epic exists for. The old rule was
     * `requiresSequentialCompletion && !isPreview`, so on a course without
     * sequential completion a guest was told every lecture was open.
     */
    it('should lock non-preview lectures on a NON-sequential course', async () => {
      const found = await curriculum(flatSlug);

      expect(found).toHaveLength(2);
      for (const lecture of found) {
        expect(lecture.isLocked).toBe(!lecture.isPreview);
      }
    });

    it('should give the identical answer on a sequential course', async () => {
      const found = await curriculum(seqSlug);

      for (const lecture of found) {
        expect(lecture.isLocked).toBe(!lecture.isPreview);
      }
    });

    it.each([
      ['non-sequential', () => flatSlug],
      ['sequential', () => seqSlug],
    ])(
      'should return the documented guest row on a %s course',
      async (_label, slug) => {
        const [preview, locked] = await curriculum(slug());

        expect(preview).toMatchObject({
          isPreview: true,
          isLocked: false,
          lockReason: null,
          requiredLectureId: null,
          progressStatus: null,
          watchDurationSecs: null,
        });
        expect(locked).toMatchObject({
          isPreview: false,
          isLocked: true,
          lockReason: 'NOT_ENROLLED',
          // No predecessor to name — the lock is "not enrolled".
          requiredLectureId: null,
          progressStatus: null,
          watchDurationSecs: null,
        });
      },
    );
  });

  describe('enrolled', () => {
    beforeAll(async () => {
      for (const slug of [seqSlug, flatSlug]) {
        await request(app)
          .post(`/api/v1/courses/${slug}/enroll`)
          .auth(studentToken, { type: 'bearer' })
          .expect(201);
      }
    }, 120000);

    it('should unlock everything on a non-sequential course', async () => {
      const found = await curriculum(flatSlug, studentToken);

      expect(found.every((lecture) => lecture.isLocked === false)).toBe(true);
      expect(found.every((lecture) => lecture.lockReason === null)).toBe(true);
      expect(found.every((lecture) => lecture.requiredLectureId === null)).toBe(
        true,
      );
    });

    // null and not_started are different answers: null means "not enrolled".
    it('should report not_started rather than null once enrolled', async () => {
      const found = await curriculum(flatSlug, studentToken);

      expect(found.every((l) => l.progressStatus === 'not_started')).toBe(true);
      expect(found.every((l) => l.watchDurationSecs === 0)).toBe(true);
    });

    it('should name the blocker on a sequential course', async () => {
      const found = await curriculum(seqSlug, studentToken);

      expect(found[0]).toMatchObject({ isLocked: false, lockReason: null });
      expect(found[1]).toMatchObject({
        isLocked: true,
        lockReason: 'PREVIOUS_LECTURE_INCOMPLETE',
        requiredLectureId: seqLectureAId,
      });
    });

    it('should unlock the successor once the blocker is finished', async () => {
      await request(app)
        .post(`/api/v1/lectures/${seqLectureAId}/progress`)
        .auth(studentToken, { type: 'bearer' })
        .send({ status: 'completed' })
        .expect(200);

      const found = await curriculum(seqSlug, studentToken);

      expect(found[1]).toMatchObject({
        isLocked: false,
        lockReason: null,
        requiredLectureId: null,
      });
    }, 120000);
  });

  /**
   * §5.1 — the same URL, two answers. An authenticated student who is served
   * the anonymous answer sees a locked curriculum, which is why the client
   * must send the token and must not cache the two under one key.
   */
  describe('optional auth', () => {
    it('should answer the same URL differently with and without a token', async () => {
      const asGuest = await curriculum(flatSlug);
      const asStudent = await curriculum(flatSlug, studentToken);

      expect(asGuest.map((l) => l.isLocked)).toEqual([false, true]);
      expect(asStudent.map((l) => l.isLocked)).toEqual([false, false]);

      expect(asGuest.every((l) => l.progressStatus === null)).toBe(true);
      expect(asStudent.every((l) => l.progressStatus !== null)).toBe(true);
    });

    it('should treat a token without an enrollment as a guest', async () => {
      const stranger = await registerAndLogin(
        `e43.stranger.${runId}@example.com`,
      );

      const found = await curriculum(flatSlug, stranger.token);

      for (const lecture of found) {
        expect(lecture.isLocked).toBe(!lecture.isPreview);
        expect(lecture.progressStatus).toBeNull();
      }
    }, 120000);
  });

  // §2.2 — cheap, holds on every branch, so it is checked on every branch.
  it('should keep lockReason non-null exactly when isLocked is true', async () => {
    const payloads = await Promise.all([
      curriculum(flatSlug),
      curriculum(seqSlug),
      curriculum(flatSlug, studentToken),
      curriculum(seqSlug, studentToken),
    ]);

    for (const lectures of payloads) {
      for (const lecture of lectures) {
        expect(lecture.lockReason === null).toBe(lecture.isLocked === false);
      }
    }
  }, 120000);

  // §2.3 — requiredLectureId is non-null exactly for a sequential block.
  it('should name a requiredLectureId exactly when the lock is PREVIOUS_LECTURE_INCOMPLETE', async () => {
    const payloads = await Promise.all([
      curriculum(flatSlug),
      curriculum(seqSlug),
      curriculum(flatSlug, studentToken),
      curriculum(seqSlug, studentToken),
    ]);

    for (const lectures of payloads) {
      for (const lecture of lectures) {
        expect(lecture.requiredLectureId !== null).toBe(
          lecture.lockReason === 'PREVIOUS_LECTURE_INCOMPLETE',
        );
      }
    }
  }, 120000);
});
