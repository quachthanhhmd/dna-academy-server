import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin, makeSuperAdmin } from '../utils/admin';
import { completeOnboarding } from '../utils/onboarding';

/**
 * Epic 4 v2 — the student learning flow end to end:
 * enroll → start → open a lecture → complete it → finish the course →
 * certificate → rating → career reflection.
 */
describe('Epic 4 v2 — learning flow', () => {
  const app = APP_URL;
  const runId = Date.now();

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'Learn', lastName: 'Tester' })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password })
      .expect(200);

    // Every learning endpoint is behind OnboardingGuard.
    await completeOnboarding(app, body.token);

    return { token: body.token as string, userId: body.user.id as number };
  };

  let seededAdminToken: string;

  let adminToken: string;
  let studentToken: string;
  let courseSlug: string;
  let courseId: string;
  let enrollmentId: string;
  let lectureAId: string;
  let lectureBId: string;

  beforeAll(async () => {
    seededAdminToken = await loginSeededSuperAdmin(app);
    const admin = await registerAndLogin(`e4.admin.${runId}@example.com`);
    adminToken = admin.token;
    await makeSuperAdmin(app, seededAdminToken, admin.userId);

    const student = await registerAndLogin(`e4.student.${runId}@example.com`);
    studentToken = student.token;

    const { body: level } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_level/codes')
      .auth(adminToken, { type: 'bearer' })
      .send({ code: `e4_level_${runId}`, name: `Level ${runId}` })
      .expect(201);
    const { body: category } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_category/codes')
      .auth(adminToken, { type: 'bearer' })
      .send({ code: `e4_cat_${runId}`, name: `Category ${runId}` })
      .expect(201);
    const { body: instructor } = await request(app)
      .post('/api/v1/admin/instructors')
      .auth(adminToken, { type: 'bearer' })
      .send({ fullName: `E4 Instructor ${runId}` })
      .expect(201);

    const { body: course } = await request(app)
      .post('/api/v1/admin/courses')
      .auth(adminToken, { type: 'bearer' })
      .send({
        courseId: `E4-${runId}`,
        title: `Journey ${runId}`,
        language: 'vi',
        price: 0,
        hasCertificate: true,
        enrollmentOpen: true,
        primaryInstructorId: instructor.id,
      })
      .expect(201);
    courseId = course.id;

    await request(app)
      .patch(`/api/v1/admin/courses/${courseId}`)
      .auth(adminToken, { type: 'bearer' })
      .send({
        shortDescription: 'Short',
        thumbnailUrl: 'https://example.com/t.png',
        levelId: level.id,
        categoryId: category.id,
        requiresSequentialCompletion: true,
      })
      .expect(200);

    const { body: section } = await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections`)
      .auth(adminToken, { type: 'bearer' })
      .send({ title: 'Section', displayOrder: 1 })
      .expect(201);

    const makeLecture = async (title: string, displayOrder: number) => {
      const { body } = await request(app)
        .post(
          `/api/v1/admin/courses/${courseId}/sections/${section.id}/lectures`,
        )
        .auth(adminToken, { type: 'bearer' })
        .send({
          title,
          lectureType: 'article',
          displayOrder,
          durationSecs: 60,
          isPreview: displayOrder === 1,
          requiresCompletion: true,
        })
        .expect(201);

      await request(app)
        .patch(`/api/v1/admin/lectures/${body.id}/content`)
        .auth(adminToken, { type: 'bearer' })
        .send({ lectureType: 'article', body: `<p>${title}</p>` })
        .expect(200);

      return body.id as string;
    };

    lectureAId = await makeLecture('Lecture A', 1);
    lectureBId = await makeLecture('Lecture B', 2);

    await request(app)
      .post(`/api/v1/admin/courses/${courseId}/publish`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);

    const { body: detail } = await request(app)
      .get(`/api/v1/admin/courses/${courseId}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    courseSlug = detail.slug;
  }, 120000);

  describe('overview and preview', () => {
    it('should expose requiresSequentialCompletion', async () => {
      await request(app)
        .get(`/api/v1/courses/${courseSlug}`)
        .expect(200)
        .expect(({ body }) =>
          expect(body.requiresSequentialCompletion).toBe(true),
        );
    });

    it('should serve a preview lecture without auth', async () => {
      await request(app)
        .get(`/api/v1/courses/${courseSlug}/preview-lectures/${lectureAId}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.isPreview).toBe(true);
          expect(body.contentPayload.bodyHtml).toContain('Lecture A');
        });
    });

    it('should refuse a non-preview lecture without auth', async () => {
      await request(app)
        .get(`/api/v1/courses/${courseSlug}/preview-lectures/${lectureBId}`)
        .expect(403);
    });
  });

  describe('enrollment and the player', () => {
    it('should enroll and start', async () => {
      const { body: enrolled } = await request(app)
        .post(`/api/v1/courses/${courseSlug}/enroll`)
        .auth(studentToken, { type: 'bearer' })
        .expect(201);
      enrollmentId = enrolled.enrollmentId;

      await request(app)
        .post(`/api/v1/enrollments/${enrollmentId}/start`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => expect(body.status).toBe('in_progress'));
    });

    it('should refuse the player to a student who is not enrolled', async () => {
      const other = await registerAndLogin(`e4.other.${runId}@example.com`);

      await request(app)
        .get(`/api/v1/courses/${courseSlug}/lectures/${lectureAId}`)
        .auth(other.token, { type: 'bearer' })
        .expect(403);
    });

    it('should lock the second lecture until the first is complete', async () => {
      await request(app)
        .get(`/api/v1/courses/${courseSlug}/lectures/${lectureBId}`)
        .auth(studentToken, { type: 'bearer' })
        .expect(403)
        .expect(({ body }) => {
          expect(body.code).toBe('PREVIOUS_LECTURE_INCOMPLETE');
          expect(body.requiredLectureId).toBe(lectureAId);
        });
    });

    it('should open the first lecture with navigation', async () => {
      await request(app)
        .get(`/api/v1/courses/${courseSlug}/lectures/${lectureAId}`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.prevLectureId).toBeNull();
          expect(body.nextLectureId).toBe(lectureBId);
          expect(body.progressStatus).toBe('not_started');
        });
    });
  });

  describe('progress and completion', () => {
    it('should record progress and move the percentage', async () => {
      await request(app)
        .post(`/api/v1/lectures/${lectureAId}/progress`)
        .auth(studentToken, { type: 'bearer' })
        .send({ status: 'completed' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.progressPct).toBe(50);
          expect(body.enrollmentStatus).toBe('in_progress');
        });
    });

    it('should unlock the next lecture once the first is done', async () => {
      await request(app)
        .get(`/api/v1/courses/${courseSlug}/lectures/${lectureBId}`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200);
    });

    it('should store a watch position without changing progress', async () => {
      await request(app)
        .put(`/api/v1/lectures/${lectureBId}/watch-position`)
        .auth(studentToken, { type: 'bearer' })
        .send({ watchDurationSecs: 25 })
        .expect(204);

      await request(app)
        .get(`/api/v1/courses/${courseSlug}/lectures/${lectureBId}`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => expect(body.watchDurationSecs).toBe(25));
    });

    it('should complete the course on the last required lecture', async () => {
      await request(app)
        .post(`/api/v1/lectures/${lectureBId}/progress`)
        .auth(studentToken, { type: 'bearer' })
        .send({ status: 'completed' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.progressPct).toBe(100);
          expect(body.enrollmentStatus).toBe('completed');
        });
    });
  });

  describe('certificate, rating and career reflection', () => {
    it('should issue a certificate with the DNA number format', async () => {
      await request(app)
        .get(`/api/v1/enrollments/${enrollmentId}/certificate`)
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.ready).toBe(true);
          expect(body.certificate.number).toMatch(/^DNA-\d{4}-\d{6}$/);
          expect(body.certificate.courseTitle).toBe(`Journey ${runId}`);
        });
    });

    it('should hold a written review for moderation', async () => {
      await request(app)
        .post(`/api/v1/enrollments/${enrollmentId}/rating`)
        .auth(studentToken, { type: 'bearer' })
        .send({ rating: 5, reviewText: 'Excellent' })
        .expect(200)
        .expect(({ body }) => expect(body.reviewStatus).toBe('pending'));
    });

    it('should reject a rating outside 1-5', async () => {
      await request(app)
        .post(`/api/v1/enrollments/${enrollmentId}/rating`)
        .auth(studentToken, { type: 'bearer' })
        .send({ rating: 9 })
        .expect(422);
    });

    it('should let the student edit their rating', async () => {
      await request(app)
        .put(`/api/v1/enrollments/${enrollmentId}/rating`)
        .auth(studentToken, { type: 'bearer' })
        .send({ rating: 4 })
        .expect(200)
        .expect(({ body }) => expect(body.rating).toBe(4));
    });

    // Epic 4.6 — a flat, ordered list; the path keeps "/grouped" only for
    // compatibility.
    it('should list the career reflection questions for the course', async () => {
      await request(app)
        .get(`/api/v1/career-reflection-questions/grouped?courseId=${courseId}`)
        .expect(200)
        .expect(({ body }) => {
          expect(Array.isArray(body.questions)).toBe(true);
          expect(body.questions.length).toBeGreaterThanOrEqual(5);
          expect(body.rules.minTextLength).toEqual(expect.any(Number));
        });
    });

    it('should surface the certificate id on My Courses', async () => {
      await request(app)
        .get('/api/v1/students/me/courses')
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          // Epic 4.5 §1.2 — the endpoint returns an envelope now.
          const card = body.data.find(
            (item) => item.enrollmentId === enrollmentId,
          );
          expect(card.status).toBe('completed');
          expect(card.hasCertificate).toBe(true);
          expect(card.certificateId).toEqual(expect.any(String));
          expect(card.courseThumbnailUrl).toBe('https://example.com/t.png');
        });
    });
  });

  describe('catalog filters', () => {
    it('should accept the Epic 4 v2 filters and sort', async () => {
      await request(app)
        .get(
          '/api/v1/courses?hasCertificate=true&minDurationSecs=0&maxDurationSecs=999999&sortBy=highest_rated',
        )
        .expect(200)
        .expect(({ body }) => expect(Array.isArray(body.data)).toBe(true));
    });

    it('should reject an unknown sort', async () => {
      await request(app).get('/api/v1/courses?sortBy=random').expect(422);
    });
  });
});
