import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin } from '../utils/admin';

/**
 * Permission model §1.10 / §2.1 — the security floor.
 *
 * These generated CRUD controllers wrote with nothing but a login (course
 * content, other students' profiles, authorization metadata), or exposed every
 * student's data behind `courses:edit` — a permission instructors now hold.
 * Their services stay; the HTTP surface is gone.
 *
 * Every request goes out with the seeded Admin's token, which holds every
 * permission. A 404 therefore means "not mounted" — a mounted route would
 * answer 200, 201, 400 or 422 to this caller, never 404 on its collection.
 */
describe('Removed generated routes (permission model §1.10)', () => {
  const app = APP_URL;
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await loginSeededSuperAdmin(app);
  });

  const removedCollections = [
    // Open to every logged-in user; replaced by /admin/courses/**
    'lectures',
    'sections',
    'lecture-content-articles',
    'lecture-content-documents',
    'lecture-content-quizzes',
    'lecture-content-reflections',
    'lecture-content-videos',
    'course-learning-outcomes',
    'course-requirements',
    'course-target-learners',
    'course-group-assignments',
    // Any user could edit any profile
    'student-profiles',
    'student-career-interests',
    // Open writes to authorization and file metadata
    'permissions',
    'modules',
    'media-files',
    'master-data-groups',
    // Student data behind courses:edit
    'course-ratings',
    'reflection-responses',
    'quiz-attempts',
    'quiz-attempt-answers',
    'quiz-saves',
    'enrollments',
    'certificates',
    'career-reflection-answers',
    'lecture-progresses',
    'quiz-questions',
    'quiz-answer-options',
    'reflection-questions',
    // The global question bank behind courses:edit; /admin/career-reflection-questions replaces it
    'career-reflection-questions',
  ];

  describe.each(removedCollections)('/%s', (collection) => {
    it('should not serve the collection', () => {
      return request(app)
        .get(`/api/v1/${collection}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(404);
    });

    it('should not accept a create', () => {
      return request(app)
        .post(`/api/v1/${collection}`)
        .auth(adminToken, { type: 'bearer' })
        .send({})
        .expect(404);
    });
  });

  describe('/master-data-codes', () => {
    let existingCodeId: string;

    beforeAll(async () => {
      const { body } = await request(app)
        .get('/api/v1/master-data-codes?groupKey=course_level&limit=1')
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      existingCodeId = body.data[0].id;
    });

    // Onboarding reads it.
    it('should still serve reads by group', async () => {
      const { body } = await request(app)
        .get('/api/v1/master-data-codes?groupKey=course_level')
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      expect(body.data.length).toBeGreaterThan(0);
    });

    it('should not accept a create', () => {
      return request(app)
        .post('/api/v1/master-data-codes')
        .auth(adminToken, { type: 'bearer' })
        .send({ code: 'x', name: 'x' })
        .expect(404);
    });

    it('should not accept an edit of an existing code', () => {
      return request(app)
        .patch(`/api/v1/master-data-codes/${existingCodeId}`)
        .auth(adminToken, { type: 'bearer' })
        .send({ name: 'renamed' })
        .expect(404);
    });

    it('should not accept a delete of an existing code', () => {
      return request(app)
        .delete(`/api/v1/master-data-codes/${existingCodeId}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(404);
    });
  });
});
