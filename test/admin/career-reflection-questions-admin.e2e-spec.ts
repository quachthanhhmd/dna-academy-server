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

const BASE = '/api/v1/admin/career-reflection-questions';

/**
 * Epic 4.6 BE-6 — authoring the certificate-screen questions.
 *
 * **Every question here belongs to a throwaway course.** Suites run in
 * parallel against one database, and since Epic 4.6 every active global
 * question is required on every student's form — an active global question
 * created here would make the other suites' valid submissions fail.
 */
describe('Admin / Career Reflection Questions', () => {
  const app = APP_URL;
  const runId = Date.now();

  let db: Client;
  let adminToken: string;
  let studentToken: string;
  let courseId: string;
  let enrollmentId: string;
  let selectionId: string;
  let freeTextId: string;

  const create = (payload: Record<string, unknown>) =>
    request(app)
      .post(BASE)
      .auth(adminToken, { type: 'bearer' })
      .send({ course: { id: courseId }, isActive: true, ...payload });

  const patch = (id: string, payload: Record<string, unknown>) =>
    request(app)
      .patch(`${BASE}/${id}`)
      .auth(adminToken, { type: 'bearer' })
      .send(payload);

  const answer = (
    questionId: string,
    rating: number | null,
    text: string | null,
  ) =>
    db.query(
      `INSERT INTO "career_reflection_answer"
         ("enrollment_id", "question_id", "rating_answer", "text_answer", "submitted_at")
       VALUES ($1, $2, $3, $4, now())`,
      [enrollmentId, questionId, rating, text],
    );

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

    const email = `crq.student.${runId}@example.com`;
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password: 'secret', firstName: 'CRQ', lastName: 'User' })
      .expect(204);
    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password: 'secret' })
      .expect(200);
    studentToken = body.token;

    const course = await db.query(
      `INSERT INTO "course"
         ("title", "slug", "status", "language", "price", "is_free",
          "has_certificate", "enrollment_open", "total_sections",
          "total_lectures", "total_duration_secs", "total_enrollments")
       VALUES ($1, $2, 'draft', 'vi', 0, true, true, true, 0, 0, 0, 0)
       RETURNING "id"`,
      [`CRQ admin ${runId}`, `crq-admin-${runId}`],
    );
    courseId = course.rows[0].id;

    const enrollment = await db.query(
      `INSERT INTO "enrollment"
         ("student_id", "course_id", "enrollment_date", "status", "progress_pct")
       VALUES ($1, $2, now(), 'completed', 100) RETURNING "id"`,
      [body.user.id, courseId],
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

  describe('create', () => {
    it('should create a selection with keys, translations and isRequired', async () => {
      const { body } = await create({
        questionType: 'selection',
        questionText: 'Bạn có dự định chia sẻ?',
        questionTextTranslations: { en: 'Will you share?' },
        options: [
          {
            key: 1,
            label: 'Chắc chắn',
            labelTranslations: { en: 'Definitely' },
          },
          { key: 2, label: 'Không phải lúc này' },
        ],
        displayOrder: 50,
      }).expect(201);

      expect(body).toMatchObject({
        questionType: 'selection',
        isRequired: true,
        questionTextTranslations: { en: 'Will you share?' },
        options: [
          {
            key: 1,
            label: 'Chắc chắn',
            labelTranslations: { en: 'Definitely' },
          },
          { key: 2, label: 'Không phải lúc này' },
        ],
      });
      expect(body).not.toHaveProperty('labelMin');

      selectionId = body.id;
    });

    it('should create a free_text question with null options', async () => {
      const { body } = await create({
        questionType: 'free_text',
        questionText: 'Góp ý thêm cho khóa học',
        isRequired: false,
        displayOrder: 51,
      }).expect(201);

      expect(body).toMatchObject({
        questionType: 'free_text',
        options: null,
        isRequired: false,
      });

      freeTextId = body.id;
    });

    it('should accept an option label as long as the seeded Vietnamese ones', async () => {
      const long =
        'Hiểu rõ nội dung khóa học, qua đó giúp tôi khám phá ra được tôi "có thể" hợp với ngành/nghề này, tuy nhiên vẫn cần khám phá thêm';

      expect(long.length).toBeGreaterThan(100);

      const { body } = await create({
        questionType: 'selection',
        questionText: 'Nhãn dài',
        options: [
          { key: 1, label: long },
          { key: 2, label: 'Ngắn' },
        ],
        displayOrder: 52,
        isActive: false,
      }).expect(201);

      await request(app)
        .delete(`${BASE}/${body.id}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(204);
    });

    it('should require questionType', async () => {
      await create({ questionText: 'Thiếu loại', displayOrder: 53 }).expect(
        422,
      );
    });

    it.each(['slider', 'radio', 'select'])(
      'should refuse the retired type %s',
      async (questionType) => {
        await create({
          questionType,
          questionText: 'Cũ',
          options: [
            { key: 1, label: 'A' },
            { key: 2, label: 'B' },
          ],
          displayOrder: 54,
        }).expect(422);
      },
    );

    it('should refuse a selection with no options', async () => {
      const { body } = await create({
        questionType: 'selection',
        questionText: 'Không có lựa chọn',
        displayOrder: 55,
      }).expect(422);

      expect(body.errors).toEqual({ options: 'requiredForType' });
    });

    it('should refuse a free_text question that carries options', async () => {
      const { body } = await create({
        questionType: 'free_text',
        questionText: 'Tự luận có lựa chọn',
        options: [
          { key: 1, label: 'A' },
          { key: 2, label: 'B' },
        ],
        displayOrder: 56,
      }).expect(422);

      expect(body.errors).toEqual({ options: 'notAllowedForType' });
    });

    it('should refuse duplicate keys', async () => {
      const { body } = await create({
        questionType: 'selection',
        questionText: 'Trùng khóa',
        options: [
          { key: 1, label: 'A' },
          { key: 1, label: 'B' },
        ],
        displayOrder: 57,
      }).expect(422);

      expect(body.errors).toEqual({ options: 'duplicateKey' });
    });
  });

  describe('list', () => {
    it('should list a course’s questions for authoring', async () => {
      const { body } = await request(app)
        .get(`${BASE}?courseId=${courseId}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      expect(body.map((q) => q.id)).toEqual(
        expect.arrayContaining([selectionId, freeTextId]),
      );
    });
  });

  describe('edits never strand answers already given', () => {
    beforeAll(async () => {
      await answer(selectionId, 2, null);
    });

    it('should allow relabelling and reordering, since answers store the key', async () => {
      const { body } = await patch(selectionId, {
        options: [
          { key: 2, label: 'Để sau' },
          { key: 1, label: 'Chắc chắn rồi', labelTranslations: { en: 'Sure' } },
        ],
      }).expect(200);

      expect(body.options.map((o) => o.key)).toEqual([2, 1]);
    });

    it('should refuse to remove an option key that has answers', async () => {
      const { body } = await patch(selectionId, {
        options: [
          { key: 1, label: 'Chắc chắn rồi' },
          { key: 3, label: 'Mới' },
        ],
      }).expect(409);

      expect(body.errors).toEqual({ options: 'optionKeyInUse:2' });
    });

    it('should allow removing a key nobody chose', async () => {
      await patch(selectionId, {
        options: [
          { key: 2, label: 'Để sau' },
          { key: 3, label: 'Mới' },
        ],
      }).expect(200);
    });

    it('should refuse to change the type of an answered question', async () => {
      const { body } = await patch(selectionId, {
        questionType: 'free_text',
      }).expect(409);

      expect(body.errors).toEqual({ questionType: 'questionHasAnswers' });
    });

    it('should allow changing the type of an unanswered question', async () => {
      const { body } = await patch(freeTextId, {
        questionType: 'selection',
        options: [
          { key: 1, label: 'Có' },
          { key: 2, label: 'Không' },
        ],
      }).expect(200);

      expect(body.questionType).toBe('selection');

      await patch(freeTextId, { questionType: 'free_text' }).expect(200);
    });
  });

  describe('delete and deactivate', () => {
    it('should refuse to delete an answered question', async () => {
      const { body } = await request(app)
        .delete(`${BASE}/${selectionId}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(409);

      expect(body.errors).toEqual({ id: 'questionHasAnswers' });
    });

    it('should deactivate an answered question and keep its answers', async () => {
      await request(app)
        .patch(`${BASE}/${selectionId}/deactivate`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => expect(body.isActive).toBe(false));

      const { rows } = await db.query(
        `SELECT COUNT(*)::int AS n FROM "career_reflection_answer" WHERE "question_id" = $1`,
        [selectionId],
      );

      expect(rows[0].n).toBe(1);
    });

    it('should hide a deactivated question from the student form', async () => {
      const { body } = await request(app)
        .get(`/api/v1/career-reflection-questions/grouped?courseId=${courseId}`)
        .expect(200);

      expect(body.questions.some((q) => q.id === selectionId)).toBe(false);
    });

    it('should delete an unanswered question outright', async () => {
      await request(app)
        .delete(`${BASE}/${freeTextId}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(204);

      await request(app)
        .delete(`${BASE}/${freeTextId}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(404);
    });
  });

  describe('permissions', () => {
    it('should refuse the authoring surface to a student', async () => {
      await request(app)
        .get(BASE)
        .auth(studentToken, { type: 'bearer' })
        .expect(403);
    });

    it('should refuse creation to a student', async () => {
      await request(app)
        .post(BASE)
        .auth(studentToken, { type: 'bearer' })
        .send({
          questionText: 'Nope',
          questionType: 'free_text',
          displayOrder: 1,
          isActive: false,
        })
        .expect(403);
    });

    it('should refuse deletion to a student', async () => {
      await request(app)
        .delete(`${BASE}/${selectionId}`)
        .auth(studentToken, { type: 'bearer' })
        .expect(403);
    });

    it('should refuse an anonymous caller', async () => {
      await request(app).get(BASE).expect(401);
    });
  });

  /**
   * Epic 4.2 §3.2 — BUG-07. Without this, every learning scenario is a
   * one-shot and QA has to mint a new account for each run.
   */
  describe('progress reset', () => {
    it('should refuse the reset to a student', async () => {
      await request(app)
        .delete(
          '/api/v1/admin/enrollments/00000000-0000-4000-8000-000000000000/progress',
        )
        .auth(studentToken, { type: 'bearer' })
        .expect(403);
    });

    it('should refuse an anonymous caller', async () => {
      await request(app)
        .delete(
          '/api/v1/admin/enrollments/00000000-0000-4000-8000-000000000000/progress',
        )
        .expect(401);
    });

    it('should 404 an enrollment that does not exist', async () => {
      await request(app)
        .delete(
          '/api/v1/admin/enrollments/00000000-0000-4000-8000-000000000000/progress',
        )
        .auth(adminToken, { type: 'bearer' })
        .expect(404);
    });
  });
});
