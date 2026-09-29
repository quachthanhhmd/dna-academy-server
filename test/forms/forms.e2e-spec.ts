import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import {
  loginSeededSuperAdmin,
  SEEDED_ADMIN_EMAIL,
  SEEDED_ADMIN_PASSWORD,
} from '../utils/admin';
import { registerAndLogin, uniqueEmail, type Account } from '../utils/fixtures';

/**
 * EPIC-08 forms API.
 *
 * The public surface is exercised without auth on purpose: the definition and
 * the submission are what the landing page calls, and the server must validate
 * them independently of the client. The admin surface is exercised for the
 * permission gate, the status event it writes, and the read shapes the drawer
 * consumes.
 */
describe('Forms API (EPIC-08)', () => {
  const app = APP_URL;
  const runId = Date.now();
  let adminToken: string;
  let plainUser: Account;

  const submit = (code: string, body: Record<string, unknown>) =>
    request(app).post(`/api/v1/public/forms/${code}/submissions`).send(body);

  const validWaitlist = (email: string) => ({
    answers: [
      { questionCode: 'full_name', text: 'Nguyễn Văn Test' },
      { questionCode: 'email', text: email },
      { questionCode: 'profession', optionCodes: ['business_analysis'] },
    ],
    consents: ['contact'],
    context: { source: 'landing', locale: 'vi' },
    _hp: '',
    startedAt: Date.now() - 60_000,
  });

  beforeAll(async () => {
    adminToken = await loginSeededSuperAdmin(app);
    plainUser = await registerAndLogin(app, `forms.plain.${runId}`);
  });

  describe('public definition', () => {
    it('should return the localised tree with sections in authored order', async () => {
      const { body } = await request(app)
        .get('/api/v1/public/forms/free_course_waitlist')
        .set('X-Locale', 'vi')
        .expect(200);

      expect(body.code).toBe('free_course_waitlist');
      expect(body.sections.map((s: { code: string }) => s.code)).toEqual([
        'student_info',
        'learning_needs',
        'consent',
      ]);
    });

    it('should answer in English when asked', async () => {
      const vi = await request(app)
        .get('/api/v1/public/forms/free_course_waitlist')
        .set('X-Locale', 'vi');
      const en = await request(app)
        .get('/api/v1/public/forms/free_course_waitlist')
        .set('X-Locale', 'en');

      expect(en.status).toBe(200);
      expect(en.body.name).not.toBe(vi.body.name);
      expect(en.body.name).toMatch(/waitlist/i);
    });

    it('should narrow Form A to six professions and unlock the BA skill list', async () => {
      const { body } = await request(app)
        .get('/api/v1/public/forms/advanced_course_interest')
        .expect(200);

      const questions = body.sections.flatMap(
        (s: { questions: unknown[] }) => s.questions,
      ) as {
        code: string;
        options: { code: string }[];
        parentQuestionCode?: string | null;
        parentOptionCode?: string | null;
      }[];

      const profession = questions.find((q) => q.code === 'profession');
      const skills = questions.find((q) => q.code === 'skills');

      expect(profession?.options).toHaveLength(6);
      expect(profession?.options.map((o) => o.code)).toContain('other');
      expect(skills?.parentQuestionCode).toBe('profession');
      expect(skills?.parentOptionCode).toBe('business_analysis');
      expect(skills?.options.length).toBeGreaterThan(5);
    });

    it('should 404 an unknown form', async () => {
      await request(app)
        .get('/api/v1/public/forms/definitely_not_a_form')
        .expect(404);
    });
  });

  describe('public submission', () => {
    it('should create a submission and return 201 with its id and status', async () => {
      const email = uniqueEmail(`forms.valid.${runId}`);
      const { body } = await submit(
        'free_course_waitlist',
        validWaitlist(email),
      ).expect(201);

      expect(body.id).toBeTruthy();
      expect(body.status).toBe('new');
    });

    it('should accept the landing_cta source the Ready CTA band posts', async () => {
      const email = uniqueEmail(`forms.cta.${runId}`);
      await submit('free_course_waitlist', {
        ...validWaitlist(email),
        context: { source: 'landing_cta', locale: 'vi' },
      }).expect(201);
    });

    it('should reject a source outside the allowlist', async () => {
      await submit('free_course_waitlist', {
        ...validWaitlist(uniqueEmail(`forms.badsrc.${runId}`)),
        context: { source: 'not-a-source' },
      }).expect(422);
    });

    it('should reject an option outside the question allowlist', async () => {
      const { body } = await submit('free_course_waitlist', {
        ...validWaitlist(uniqueEmail(`forms.badopt.${runId}`)),
        answers: [
          { questionCode: 'full_name', text: 'Nguyễn Văn Test' },
          { questionCode: 'email', text: uniqueEmail('forms.badopt') },
          { questionCode: 'referral_source', optionCodes: ['not_a_code'] },
        ],
      }).expect(422);

      expect(body.errors).toHaveProperty('referral_source');
    });

    it('should require the free text when `other` is chosen', async () => {
      const { body } = await submit('free_course_waitlist', {
        ...validWaitlist(uniqueEmail(`forms.other.${runId}`)),
        answers: [
          { questionCode: 'full_name', text: 'Nguyễn Văn Test' },
          { questionCode: 'email', text: uniqueEmail('forms.other') },
          { questionCode: 'profession', optionCodes: ['other'] },
        ],
      }).expect(422);

      expect(body.errors.profession).toBe('other_text_required');
    });

    it('should require every required consent', async () => {
      const { body } = await submit('free_course_waitlist', {
        ...validWaitlist(uniqueEmail(`forms.consent.${runId}`)),
        consents: [],
      }).expect(422);

      expect(body.errors).toHaveProperty('consents');
    });

    it('should reject a conditional answer whose parent branch is not taken', async () => {
      const { body } = await submit('advanced_course_interest', {
        answers: [
          { questionCode: 'full_name', text: 'Nguyễn Văn Test' },
          { questionCode: 'email', text: uniqueEmail('forms.cond') },
          { questionCode: 'phone', text: '0901234567' },
          { questionCode: 'current_level', optionCodes: ['self_taught'] },
          { questionCode: 'profession', optionCodes: ['data_analytics'] },
          { questionCode: 'skills', optionCodes: ['sql'] },
          { questionCode: 'session_slot', optionCodes: ['weekday_evening'] },
          { questionCode: 'learning_goal', optionCodes: ['upskill'] },
        ],
        consents: ['zoom_format', 'contact'],
        context: { source: 'certificate' },
        startedAt: Date.now() - 60_000,
      }).expect(422);

      expect(body.errors.skills).toBe('not_unlocked');
    });

    it('should record the honeypot as suspicious without rejecting the write', async () => {
      const email = uniqueEmail(`forms.bot.${runId}`);
      const { body } = await submit('free_course_waitlist', {
        ...validWaitlist(email),
        _hp: 'i-am-a-robot',
      }).expect(201);

      const detail = await request(app)
        .get(`/api/v1/admin/forms/submissions/${body.id}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      expect(detail.body.isSuspicious).toBe(true);
    });

    it('should supersede the previous live submission for the same email', async () => {
      const email = uniqueEmail(`forms.resub.${runId}`);
      await submit('free_course_waitlist', validWaitlist(email)).expect(201);
      await submit('free_course_waitlist', validWaitlist(email)).expect(201);

      const { body } = await request(app)
        .get(
          `/api/v1/admin/forms/submissions?formCode=free_course_waitlist&q=${email}&includeSuperseded=true`,
        )
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      expect(body.total).toBe(2);
      expect(body.data).toHaveLength(2);
    });
  });

  describe('prefill', () => {
    it('should 401 without a session and return the caller details with one', async () => {
      await request(app)
        .get('/api/v1/public/forms/advanced_course_interest/prefill')
        .expect(401);

      const { body } = await request(app)
        .get('/api/v1/public/forms/advanced_course_interest/prefill')
        .auth(plainUser.token, { type: 'bearer' })
        .expect(200);

      expect(body.email).toBe(plainUser.email);
    });
  });

  describe('admin permission gate', () => {
    it('should 401 an anonymous caller', async () => {
      await request(app).get('/api/v1/admin/forms/submissions').expect(401);
    });

    it('should 403 a user without forms:view', async () => {
      const { body } = await request(app)
        .get('/api/v1/admin/forms/submissions')
        .auth(plainUser.token, { type: 'bearer' })
        .expect(403);

      expect(body.required).toEqual({ module: 'forms', action: 'view' });
    });

    it('should let the seeded admin list submissions', async () => {
      const { body } = await request(app)
        .get('/api/v1/admin/forms/submissions?pageSize=1')
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      expect(Array.isArray(body.data)).toBe(true);
      expect(typeof body.total).toBe('number');
    });

    it('should answer the KPI overview', async () => {
      const { body } = await request(app)
        .get('/api/v1/admin/forms/analytics/overview')
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      expect(typeof body.total).toBe('number');
      expect(body.byForm).toBeDefined();
    });
  });

  describe('admin workflow', () => {
    let submissionId: string;

    beforeAll(async () => {
      const { body } = await submit(
        'free_course_waitlist',
        validWaitlist(uniqueEmail(`forms.workflow.${runId}`)),
      ).expect(201);
      submissionId = body.id;
    });

    it('should change status and write a status_changed event', async () => {
      const patched = await request(app)
        .patch(`/api/v1/admin/forms/submissions/${submissionId}`)
        .auth(adminToken, { type: 'bearer' })
        .send({ status: 'reviewing', internalNotes: 'Called them' })
        .expect(200);

      expect(patched.body.status).toBe('reviewing');
      expect(patched.body.internalNotes).toBe('Called them');
      expect(
        patched.body.events.map((e: { event: string }) => e.event),
      ).toContain('status_changed');
    });

    it('should return answers with localised option names', async () => {
      const { body } = await request(app)
        .get(`/api/v1/admin/forms/submissions/${submissionId}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      const profession = body.answers.find(
        (a: { questionCode: string }) => a.questionCode === 'profession',
      );
      expect(profession.optionCodes).toEqual(['business_analysis']);
      expect(profession.optionNames[0]).toMatch(/nghiệp vụ/i);
    });

    it('should export CSV with the same filters', async () => {
      const response = await request(app)
        .get(
          `/api/v1/admin/forms/submissions/export.csv?formCode=free_course_waitlist`,
        )
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/csv/);
      expect(response.text.split('\n')[0]).toContain('formCode');
    });

    it('should 404 an unknown submission', async () => {
      await request(app)
        .get(
          '/api/v1/admin/forms/submissions/00000000-0000-0000-0000-000000000000',
        )
        .auth(adminToken, { type: 'bearer' })
        .expect(404);
    });
  });

  it('should expose the seeded admin credentials the suite relies on', () => {
    expect(SEEDED_ADMIN_EMAIL).toBe('admin@example.com');
    expect(SEEDED_ADMIN_PASSWORD).toBe('secret');
  });
});
