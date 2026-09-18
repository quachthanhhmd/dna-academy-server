import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { Client } from 'pg';
import request from 'supertest';
import { loginSeededSuperAdmin } from '../utils/admin';
import {
  APP_URL,
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_PORT,
  DB_USER,
} from '../utils/constants';
import { completeOnboarding } from '../utils/onboarding';

/** The five seeded global questions (migration 1787500000000). */
const Q = {
  purpose: '4e6a0001-0000-4000-8000-000000000001',
  outcome: '4e6a0001-0000-4000-8000-000000000002',
  nextStep: '4e6a0001-0000-4000-8000-000000000003',
  feedback: '4e6a0001-0000-4000-8000-000000000004',
  shareIntent: '4e6a0001-0000-4000-8000-000000000005',
};

const valid = (outcome = 1) => [
  { questionId: Q.purpose, textAnswer: '  Muốn thử sức với ngành tài chính  ' },
  { questionId: Q.outcome, ratingAnswer: outcome },
  { questionId: Q.nextStep, ratingAnswer: 2 },
  { questionId: Q.feedback, textAnswer: 'Nên thêm bài tập thực hành' },
  { questionId: Q.shareIntent, ratingAnswer: 1 },
];

/**
 * Epic 4.6 — the certificate-screen career reflection, against a real
 * database.
 *
 * The completed enrolment is inserted through SQL: completing a course through
 * the API means authoring and finishing every lecture, which is not what this
 * suite is about. Everything else goes through HTTP. Rows are tagged by the
 * run id and removed in `afterAll`.
 */
describe('Epic 4.6 — career reflection (student)', () => {
  const app = APP_URL;
  const runId = Date.now();
  let db: Client;
  let token: string;
  let otherToken: string;
  let adminToken: string;
  let courseId: string;
  let enrollmentId: string;

  const register = async (label: string) => {
    const email = `crq46.${label}.${runId}@example.com`;
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password: 'secret', firstName: 'Hường', lastName: label })
      .expect(204);
    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password: 'secret' })
      .expect(200);
    await completeOnboarding(app, body.token);

    return { token: body.token as string, id: body.user.id as number };
  };

  const url = (id = enrollmentId) =>
    `/api/v1/enrollments/${id}/career-reflection`;

  const submit = (answers: unknown[], as = token) =>
    request(app).post(url()).auth(as, { type: 'bearer' }).send({ answers });

  beforeAll(async () => {
    db = new Client({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });
    await db.connect();

    adminToken = await loginSeededSuperAdmin(app);
    const student = await register('owner');
    token = student.token;
    otherToken = (await register('other')).token;

    const course = await db.query(
      `INSERT INTO "course"
         ("title", "slug", "status", "language", "price", "is_free",
          "has_certificate", "enrollment_open", "total_sections",
          "total_lectures", "total_duration_secs", "total_enrollments")
       VALUES ($1, $2, 'published', 'vi', 0, true, true, true, 0, 0, 0, 0)
       RETURNING "id"`,
      [`CRQ46 ${runId}`, `crq46-${runId}`],
    );
    courseId = course.rows[0].id;

    const enrollment = await db.query(
      `INSERT INTO "enrollment"
         ("student_id", "course_id", "enrollment_date", "status",
          "progress_pct", "completed_at")
       VALUES ($1, $2, now(), 'completed', 100, now())
       RETURNING "id"`,
      [student.id, courseId],
    );
    enrollmentId = enrollment.rows[0].id;
  }, 120000);

  afterAll(async () => {
    if (!db) {
      return;
    }

    await db.query(
      `DELETE FROM "career_reflection_answer" WHERE "enrollment_id" = $1`,
      [enrollmentId],
    );
    await db.query(
      `DELETE FROM "career_reflection_question" WHERE "course_id" = $1`,
      [courseId],
    );
    await db.query(`DELETE FROM "enrollment" WHERE "id" = $1`, [enrollmentId]);
    await db.query(`DELETE FROM "course" WHERE "id" = $1`, [courseId]);
    await db.end();
  });

  describe('GET /career-reflection-questions/grouped (BE-3)', () => {
    it('should return the five seeded questions as one flat, ordered list', async () => {
      const { body } = await request(app)
        .get(`/api/v1/career-reflection-questions/grouped?courseId=${courseId}`)
        .expect(200);

      expect(body.questions.map((q) => q.id)).toEqual(Object.values(Q));
      expect(body.questions.map((q) => q.questionType)).toEqual([
        'free_text',
        'selection',
        'selection',
        'free_text',
        'selection',
      ]);
      expect(body.questions.every((q) => q.isRequired === true)).toBe(true);
    });

    it('should carry option keys and send options as null for free text', async () => {
      const { body } = await request(app)
        .get(`/api/v1/career-reflection-questions/grouped?courseId=${courseId}`)
        .expect(200);

      expect(body.questions[0].options).toBeNull();
      expect(body.questions[1].options.map((o) => o.key)).toEqual([1, 2, 3]);
      expect(body.questions[2].options.map((o) => o.key)).toEqual([1, 2]);
      expect(body.questions[4].options.map((o) => o.key)).toEqual([1, 2]);
    });

    it('should send the minimum text length so the client enforces the same rule', async () => {
      const { body } = await request(app)
        .get(`/api/v1/career-reflection-questions/grouped?courseId=${courseId}`)
        .expect(200);

      expect(body.rules).toEqual({ minTextLength: 10 });
    });

    it('should serve Vietnamese by default, verbatim from §1', async () => {
      const { body } = await request(app)
        .get(`/api/v1/career-reflection-questions/grouped?courseId=${courseId}`)
        .expect(200);

      expect(body.questions[4].questionText).toBe(
        'Bạn có dự định chia sẻ nền tảng học tập hướng nghiệp này cho bạn bè/người quen?',
      );
      expect(body.questions[4].options[1].label).toBe('Không phải lúc này');
    });

    it('should serve English under X-Locale: en', async () => {
      const { body } = await request(app)
        .get(`/api/v1/career-reflection-questions/grouped?courseId=${courseId}`)
        .set('X-Locale', 'en')
        .expect(200);

      expect(body.questions[2].questionText).toBe(
        'What is your next intention?',
      );
      expect(body.questions[4].options[0].label).toBe('Definitely');
    });

    it('should no longer group by category or ship raw translations', async () => {
      const { body } = await request(app)
        .get(`/api/v1/career-reflection-questions/grouped?courseId=${courseId}`)
        .expect(200);
      const text = JSON.stringify(body);

      expect(text).not.toContain('category');
      expect(text).not.toContain('Translations');
      expect(text).not.toContain('labelMin');
    });
  });

  describe('POST /enrollments/:id/career-reflection (BE-4)', () => {
    it('should require authentication', async () => {
      await request(app).post(url()).send({ answers: valid() }).expect(401);
    });

    it("should refuse another student's enrollment", async () => {
      await submit(valid(), otherToken).expect(403);
    });

    it('should report every required question when nothing is sent', async () => {
      const { body } = await submit([]).expect(422);

      expect(body.errors.answers).toEqual(
        Object.fromEntries(Object.values(Q).map((id) => [id, 'required'])),
      );
    });

    it('should report every problem in one response', async () => {
      const { body } = await submit([
        { questionId: Q.purpose, textAnswer: '   ngắn   ' },
        { questionId: Q.outcome, ratingAnswer: 9 },
        { questionId: Q.nextStep, textAnswer: 'chữ ở chỗ lựa chọn' },
        { questionId: Q.feedback, ratingAnswer: 1 },
        { questionId: '11111111-1111-4111-8111-111111111111', ratingAnswer: 1 },
      ]).expect(422);

      expect(body).toEqual({
        status: 422,
        errors: {
          answers: {
            [Q.purpose]: 'textTooShort',
            [Q.outcome]: 'invalidOptionKey',
            [Q.nextStep]: 'answerTypeMismatch',
            [Q.feedback]: 'answerTypeMismatch',
            '11111111-1111-4111-8111-111111111111': 'unknownQuestion',
            [Q.shareIntent]: 'required',
          },
        },
      });
    });

    it('should write nothing when the form is invalid', async () => {
      await submit([...valid().slice(0, 4)]).expect(422);

      const { rows } = await db.query(
        `SELECT COUNT(*)::int AS n FROM "career_reflection_answer" WHERE "enrollment_id" = $1`,
        [enrollmentId],
      );

      expect(rows[0].n).toBe(0);
    });

    it('should reject a malformed question id at the DTO', async () => {
      await submit([{ questionId: 'not-a-uuid', ratingAnswer: 1 }]).expect(422);
    });

    it('should save a valid form and return what was stored', async () => {
      const { body } = await submit(valid()).expect(200);

      expect(body.savedCount).toBe(5);
      expect(body.answers).toHaveLength(5);

      const purpose = body.answers.find((a) => a.questionId === Q.purpose);

      // Stored trimmed.
      expect(purpose.textAnswer).toBe('Muốn thử sức với ngành tài chính');
      expect(purpose.ratingAnswer).toBeNull();
    });

    it('should update in place on re-submit, never adding rows (D4)', async () => {
      const before = await db.query(
        `SELECT "submitted_at" FROM "career_reflection_answer"
          WHERE "enrollment_id" = $1 AND "question_id" = $2`,
        [enrollmentId, Q.outcome],
      );

      await submit(valid(3)).expect(200);

      const { rows } = await db.query(
        `SELECT "question_id", "rating_answer", "submitted_at", "updated_at"
           FROM "career_reflection_answer" WHERE "enrollment_id" = $1`,
        [enrollmentId],
      );
      const outcome = rows.find((r) => r.question_id === Q.outcome);

      expect(rows).toHaveLength(5);
      expect(outcome.rating_answer).toBe(3);
      // First submission time is kept; the edit shows in updated_at.
      expect(outcome.submitted_at).toEqual(before.rows[0].submitted_at);
      expect(outcome.updated_at.getTime()).toBeGreaterThanOrEqual(
        outcome.submitted_at.getTime(),
      );
    });

    it('should stay at one row per question when two submits race', async () => {
      await Promise.all([submit(valid(1)), submit(valid(2)), submit(valid(3))]);

      const { rows } = await db.query(
        `SELECT "question_id", COUNT(*)::int AS n FROM "career_reflection_answer"
          WHERE "enrollment_id" = $1 GROUP BY "question_id"`,
        [enrollmentId],
      );

      expect(rows).toHaveLength(5);
      expect(rows.every((r) => r.n === 1)).toBe(true);
    });
  });

  describe('GET /enrollments/:id/career-reflection (BE-5)', () => {
    it('should return questions, saved answers and rules for pre-filling', async () => {
      await submit(valid(2)).expect(200);

      const { body } = await request(app)
        .get(url())
        .auth(token, { type: 'bearer' })
        .expect(200);

      expect(body.questions).toHaveLength(5);
      expect(body.rules).toEqual({ minTextLength: 10 });
      expect(body.answers).toHaveLength(5);
      expect(
        body.answers.find((a) => a.questionId === Q.outcome),
      ).toMatchObject({
        ratingAnswer: 2,
        textAnswer: null,
        submittedAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it("should refuse another student's enrollment", async () => {
      await request(app)
        .get(url())
        .auth(otherToken, { type: 'bearer' })
        .expect(403);
    });
  });

  describe('course-specific questions (D1)', () => {
    let courseQuestionId: string;

    it('should add a course question to that course only, and require it', async () => {
      const { body: created } = await request(app)
        .post('/api/v1/admin/career-reflection-questions')
        .auth(adminToken, { type: 'bearer' })
        .send({
          questionType: 'selection',
          questionText: 'Bạn có muốn học tiếp khóa nâng cao?',
          options: [
            { key: 1, label: 'Có' },
            { key: 2, label: 'Không' },
          ],
          isActive: true,
          displayOrder: 6,
          course: { id: courseId },
        })
        .expect(201);
      courseQuestionId = created.id;

      const { body } = await request(app)
        .get(`/api/v1/career-reflection-questions/grouped?courseId=${courseId}`)
        .expect(200);

      expect(body.questions.map((q) => q.id)).toEqual([
        ...Object.values(Q),
        courseQuestionId,
      ]);

      const { body: errors } = await submit(valid()).expect(422);

      expect(errors.errors.answers).toEqual({ [courseQuestionId]: 'required' });
    });

    it('should drop a deactivated question from the form and from validation', async () => {
      await request(app)
        .patch(
          `/api/v1/admin/career-reflection-questions/${courseQuestionId}/deactivate`,
        )
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      await submit(valid()).expect(200);

      await submit([
        ...valid(),
        { questionId: courseQuestionId, ratingAnswer: 1 },
      ]).expect(422);
    });
  });
});
