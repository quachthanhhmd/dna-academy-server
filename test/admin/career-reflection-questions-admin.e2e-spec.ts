import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin } from '../utils/admin';

/**
 * Epic 4.1 D5 / §3.2 — `ADM_CRQ_20`, the authoring surface for the
 * post-completion reflection form.
 */
describe('Admin / Career Reflection Questions', () => {
  const app = APP_URL;
  const runId = Date.now();

  let adminToken: string;
  let studentToken: string;
  let sliderId: string;

  beforeAll(async () => {
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
  }, 120000);

  const create = (payload: Record<string, unknown>) =>
    request(app)
      .post('/api/v1/admin/career-reflection-questions')
      .auth(adminToken, { type: 'bearer' })
      .send(payload);

  it('should create a global slider question', async () => {
    const { body } = await create({
      questionText: `Slider ${runId}`,
      questionType: 'slider',
      labelMin: 'Không đồng ý',
      labelMax: 'Đồng ý',
      labelMinTranslations: { en: 'Disagree' },
      labelMaxTranslations: { en: 'Agree' },
      category: 'overall_usefulness',
      displayOrder: 900,
      isActive: true,
    }).expect(201);

    expect(body).toMatchObject({
      questionType: 'slider',
      labelMin: 'Không đồng ý',
      options: null,
    });

    sliderId = body.id;
  }, 120000);

  it('should create a radio question with its options', async () => {
    const { body } = await create({
      questionText: `Radio ${runId}`,
      questionType: 'radio',
      category: 'skill_fit',
      displayOrder: 901,
      isActive: true,
      options: [
        {
          value: 1,
          label: 'Cần luyện thêm',
          labelTranslations: { en: 'Need Practice' },
        },
        { value: 2, label: 'Tốt', labelTranslations: { en: 'Good' } },
        { value: 3, label: 'Rất tốt', labelTranslations: { en: 'Perfect' } },
      ],
    }).expect(201);

    expect(body.options).toHaveLength(3);
    expect(body.labelMin).toBeNull();
  }, 120000);

  // §3.3 — the shape rule is enforced before Postgres sees the row, so the
  // author gets a named field rather than a constraint violation.
  it('should refuse a radio with no options', async () => {
    await create({
      questionText: `Bad radio ${runId}`,
      questionType: 'radio',
      displayOrder: 902,
      isActive: true,
    })
      .expect(422)
      .expect(({ body }) =>
        expect(body.errors.options).toBe('requiredForType'),
      );
  });

  it('should refuse a slider that carries options', async () => {
    await create({
      questionText: `Bad slider ${runId}`,
      questionType: 'slider',
      displayOrder: 903,
      isActive: true,
      options: [
        { value: 1, label: 'A' },
        { value: 2, label: 'B' },
      ],
    })
      .expect(422)
      .expect(({ body }) =>
        expect(body.errors.options).toBe('notAllowedForType'),
      );
  });

  // D2 — two scales running in opposite directions land in the same category
  // bucket, and averaging them produces a number that means nothing.
  it('should refuse options that do not ascend', async () => {
    await create({
      questionText: `Descending ${runId}`,
      questionType: 'select',
      displayOrder: 904,
      isActive: true,
      options: [
        { value: 3, label: 'Perfect' },
        { value: 1, label: 'Need Practice' },
      ],
    })
      .expect(422)
      .expect(({ body }) => expect(body.errors.options).toBe('mustAscend'));
  });

  it('should refuse an unsupported question type', async () => {
    await create({
      questionText: `Freetext ${runId}`,
      questionType: 'freetext',
      displayOrder: 905,
      isActive: true,
    }).expect(422);
  });

  it('should list questions for authoring', async () => {
    await request(app)
      .get('/api/v1/admin/career-reflection-questions')
      .auth(adminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(Array.isArray(body)).toBe(true);
        expect(body.some((q) => q.id === sliderId)).toBe(true);
      });
  }, 120000);

  it('should deactivate rather than delete', async () => {
    await request(app)
      .patch(`/api/v1/admin/career-reflection-questions/${sliderId}/deactivate`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => expect(body.isActive).toBe(false));

    await request(app)
      .get('/api/v1/admin/career-reflection-questions?isActive=false')
      .auth(adminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) =>
        expect(body.some((q) => q.id === sliderId)).toBe(true),
      );
  }, 120000);

  it('should hide a deactivated question from the public read', async () => {
    await request(app)
      .get('/api/v1/career-reflection-questions/grouped')
      .expect(200)
      .expect(({ body }) => {
        const all = Object.values(body).flat() as { id: string }[];
        expect(all.some((q) => q.id === sliderId)).toBe(false);
      });
  }, 120000);

  it('should refuse the authoring surface to a student', async () => {
    await request(app)
      .get('/api/v1/admin/career-reflection-questions')
      .auth(studentToken, { type: 'bearer' })
      .expect(403);
  });

  it('should refuse creation to a student', async () => {
    await request(app)
      .post('/api/v1/admin/career-reflection-questions')
      .auth(studentToken, { type: 'bearer' })
      .send({
        questionText: 'Nope',
        questionType: 'slider',
        displayOrder: 1,
        isActive: true,
      })
      .expect(403);
  });

  it('should refuse an anonymous caller', async () => {
    await request(app)
      .get('/api/v1/admin/career-reflection-questions')
      .expect(401);
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
