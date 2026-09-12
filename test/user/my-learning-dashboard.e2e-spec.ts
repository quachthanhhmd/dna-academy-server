import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin, makeSuperAdmin } from '../utils/admin';
import { completeOnboarding } from '../utils/onboarding';

/**
 * Epic 4.5 — `GET /students/me/courses` and `GET /students/me/stats`.
 *
 * The envelope (§1.2) is a breaking change, so the shape is asserted against
 * the running API rather than only against mocks.
 */
describe('Epic 4.5 — My Learning dashboard', () => {
  const app = APP_URL;
  const runId = Date.now();

  let adminToken: string;
  let studentToken: string;
  let courseSlug: string;
  let firstLectureId: string;

  const registerAndLogin = async (email: string) => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password: 'secret', firstName: 'Dash', lastName: 'Test' })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password: 'secret' })
      .expect(200);

    await completeOnboarding(app, body.token);

    return { token: body.token as string, userId: body.user.id as number };
  };

  beforeAll(async () => {
    const seeded = await loginSeededSuperAdmin(app);
    const admin = await registerAndLogin(`e45.admin.${runId}@example.com`);
    await makeSuperAdmin(app, seeded, admin.userId);
    adminToken = (
      await request(app)
        .post('/api/v1/auth/email/login')
        .send({ email: `e45.admin.${runId}@example.com`, password: 'secret' })
        .expect(200)
    ).body.token;

    studentToken = (await registerAndLogin(`e45.student.${runId}@example.com`))
      .token;

    const { body: level } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_level/codes')
      .auth(adminToken, { type: 'bearer' })
      .send({ code: `e45_lvl_${runId}`, name: `Level ${runId}` })
      .expect(201);
    const { body: category } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_category/codes')
      .auth(adminToken, { type: 'bearer' })
      .send({ code: `e45_cat_${runId}`, name: `Category ${runId}` })
      .expect(201);
    const { body: group } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_group/codes')
      .auth(adminToken, { type: 'bearer' })
      .send({ code: `e45_grp_${runId}`, name: `Group ${runId}` })
      .expect(201);
    const { body: instructor } = await request(app)
      .post('/api/v1/admin/instructors')
      .auth(adminToken, { type: 'bearer' })
      .send({ fullName: `Dash Instructor ${runId}` })
      .expect(201);

    const { body: course } = await request(app)
      .post('/api/v1/admin/courses')
      .auth(adminToken, { type: 'bearer' })
      .send({
        courseId: `E45-${runId}`,
        title: `Dashboard ${runId}`,
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
      })
      .expect(200);

    await request(app)
      .put(`/api/v1/admin/courses/${course.id}/groups`)
      .auth(adminToken, { type: 'bearer' })
      .send({ groupIds: [group.id] });

    const { body: section } = await request(app)
      .post(`/api/v1/admin/courses/${course.id}/sections`)
      .auth(adminToken, { type: 'bearer' })
      .send({ title: 'Module 1', displayOrder: 1 })
      .expect(201);

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
          durationSecs: 600,
          isPreview: false,
          requiresCompletion: true,
        })
        .expect(201);

      await request(app)
        .patch(`/api/v1/admin/lectures/${lecture.id}/content`)
        .auth(adminToken, { type: 'bearer' })
        .send({ lectureType: 'article', body: '<p>Body</p>' })
        .expect(200);

      if (displayOrder === 1) {
        firstLectureId = lecture.id;
      }
    }

    await request(app)
      .post(`/api/v1/admin/courses/${course.id}/publish`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);

    const { body: detail } = await request(app)
      .get(`/api/v1/admin/courses/${course.id}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    courseSlug = detail.slug;

    await request(app)
      .post(`/api/v1/courses/${courseSlug}/enroll`)
      .auth(studentToken, { type: 'bearer' })
      .expect(201);
  }, 240000);

  const dashboard = async (query = '') => {
    const { body } = await request(app)
      .get(`/api/v1/students/me/courses${query}`)
      .auth(studentToken, { type: 'bearer' })
      .expect(200);

    return body;
  };

  const card = async () =>
    (await dashboard()).data.find((row) => row.course.slug === courseSlug);

  describe('envelope (§1.2)', () => {
    it('should return an envelope, not a bare array', async () => {
      const body = await dashboard();

      expect(Array.isArray(body)).toBe(false);
      expect(Object.keys(body).sort()).toEqual([
        'counts',
        'data',
        'hasNextPage',
        'limit',
        'page',
        'totalCount',
      ]);
    });

    it('should default to a page of six', async () => {
      const body = await dashboard();

      expect(body.limit).toBe(6);
      expect(body.page).toBe(1);
    });

    it('should carry all three counters', async () => {
      const body = await dashboard();

      expect(body.counts).toMatchObject({
        all: expect.any(Number),
        inProgress: expect.any(Number),
        completed: expect.any(Number),
      });
      expect(body.counts.all).toBeGreaterThanOrEqual(1);
    });

    // The contradiction the epic resolves: counts must survive filtering.
    it('should keep counts unfiltered while a tab filter is active', async () => {
      const all = await dashboard();
      const filtered = await dashboard('?status=completed');

      expect(filtered.counts).toEqual(all.counts);
      expect(filtered.totalCount).toBeLessThanOrEqual(all.totalCount);
    });

    it('should reject a status outside the enum', async () => {
      await request(app)
        .get('/api/v1/students/me/courses?status=bogus')
        .auth(studentToken, { type: 'bearer' })
        .expect(422);
    });

    it('should reject a limit above the cap', async () => {
      await request(app)
        .get('/api/v1/students/me/courses?limit=100')
        .auth(studentToken, { type: 'bearer' })
        .expect(422);
    });

    it('should require a token', async () => {
      await request(app).get('/api/v1/students/me/courses').expect(401);
    });
  });

  describe('card fields (§1.3, §1.4)', () => {
    it('should carry the new course fields', async () => {
      const found = await card();

      expect(found.course).toMatchObject({
        language: 'vi',
        totalLectures: 2,
        totalDurationSecs: 1200,
      });
      expect(found.course.courseGroup).toMatchObject({
        name: `Group ${runId}`,
      });
    });

    it('should point Start at the first lecture before anything is opened', async () => {
      const found = await card();

      expect(found.continueLecture).toMatchObject({
        id: firstLectureId,
        title: 'Lecture 1',
        sectionTitle: 'Module 1',
      });
      expect(found.remainingDurationSecs).toBe(1200);
      expect(found.completedLectureCount).toBe(0);
      expect(found.certificate).toBeNull();
    });

    it('should move Continue on after the first lecture is completed', async () => {
      // Opening the lecture is what writes `lastLecture`; posting progress
      // alone does not, which is exactly the distinction §1.3 preserves.
      await request(app)
        .get(`/api/v1/courses/${courseSlug}/lectures/${firstLectureId}`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200);

      await request(app)
        .post(`/api/v1/lectures/${firstLectureId}/progress`)
        .auth(studentToken, { type: 'bearer' })
        .send({ status: 'completed' })
        .expect(200);

      const found = await card();

      expect(found.continueLecture?.id).not.toBe(firstLectureId);
      expect(found.continueLecture?.title).toBe('Lecture 2');
      expect(found.completedLectureCount).toBe(1);
      expect(found.remainingDurationSecs).toBe(600);
      // §1.3 — lastLecture still remembers what was actually opened.
      expect(found.lastLectureId).toBe(firstLectureId);
    }, 120000);
  });

  /**
   * Epic 4.5 §1.5 (revised) — the grade is frozen onto the certificate at
   * issue time and never recomputed, whatever the student does afterwards.
   */
  describe('frozen final grade (§1.5)', () => {
    it('should freeze the grade onto the certificate and keep it there', async () => {
      // Finish the course so a certificate is issued.
      const rest = (await dashboard()).data.find(
        (row) => row.course.slug === courseSlug,
      );

      if (rest.continueLecture) {
        await request(app)
          .post(`/api/v1/lectures/${rest.continueLecture.id}/progress`)
          .auth(studentToken, { type: 'bearer' })
          .send({ status: 'completed' })
          .expect(200);
      }

      const done = await card();

      expect(done.status).toBe('completed');
      expect(done.certificate).not.toBeNull();

      // This course carries no quiz, so nothing was ever submitted — which is
      // a frozen null, rendered as no grade row rather than 0%.
      expect(done.certificate.finalGradePct).toBeNull();
      expect(done.certificate.gradeLabel).toBeNull();

      // The same frozen value on the certificate endpoint itself.
      const { body: certificate } = await request(app)
        .get(`/api/v1/enrollments/${done.enrollmentId}/certificate`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200);

      expect(certificate.certificate.finalGradePct).toBeNull();
      expect(certificate.certificate.number).toBe(done.certificate.number);
    }, 120000);

    it('should keep the grade unchanged across an admin re-issue', async () => {
      const done = await card();

      const { body: before } = await request(app)
        .get(`/api/v1/enrollments/${done.enrollmentId}/certificate`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200);

      await request(app)
        .post(`/api/v1/enrollments/${done.enrollmentId}/certificate/regenerate`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          // Regenerate corrects who the certificate is for, never what was
          // earned.
          expect(body.certificate.finalGradePct).toBe(
            before.certificate.finalGradePct,
          );
          expect(body.certificate.number).toBe(before.certificate.number);
        });
    }, 120000);
  });

  describe('stats (§1.6)', () => {
    it('should return the three momentum tiles', async () => {
      const { body } = await request(app)
        .get('/api/v1/students/me/stats')
        .auth(studentToken, { type: 'bearer' })
        .expect(200);

      expect(Object.keys(body).sort()).toEqual([
        'certificatesCount',
        'lecturesCompleted',
        'totalStudyHours',
      ]);
      expect(body.lecturesCompleted).toBeGreaterThanOrEqual(1);

      // Asserted as a relationship, not a fixed number: how many lectures this
      // student has finished depends on which tests above have run, but every
      // lecture in the fixture is 600s and D2 rounds to one decimal.
      const expectedHours =
        Math.round(((body.lecturesCompleted * 600) / 3600) * 10) / 10;

      expect(body.totalStudyHours).toBe(expectedHours);
    });

    it('should live at students/me/stats, not under courses', async () => {
      await request(app)
        .get('/api/v1/students/me/courses/stats')
        .auth(studentToken, { type: 'bearer' })
        .expect(404);
    });

    it('should require a token', async () => {
      await request(app).get('/api/v1/students/me/stats').expect(401);
    });
  });
});
