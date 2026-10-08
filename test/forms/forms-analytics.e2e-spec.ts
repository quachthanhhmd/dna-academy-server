import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin } from '../utils/admin';
import { login, uniqueEmail, type Account } from '../utils/fixtures';

/**
 * PLAN-forms-insights, Task B1: the summary endpoint and the scope it shares
 * with every other analytics route.
 *
 * The dev DB is shared across runs, so every assertion is a **delta** measured
 * from a baseline read at the start of the test, never an absolute total.
 *
 * The non-admin fixture is a *seeded* user, not `registerAndLogin`: public
 * registration sends a confirmation e-mail, and the local environment's SMTP is
 * not a working mail server, so that route 500s here. A seeded account is the
 * same "authenticated but unauthorised" case without the mail round trip.
 */
describe('Forms analytics API (PLAN-forms-insights)', () => {
  const app = APP_URL;
  const runId = Date.now();
  const PLAIN_EMAIL = 'john.doe@example.com';
  const PLAIN_PASSWORD = 'secret';
  let adminToken: string;
  let plainUser: Account;

  const summary = (query = '') =>
    request(app)
      .get(`/api/v1/admin/forms/analytics/summary${query}`)
      .auth(adminToken, { type: 'bearer' });

  const submit = (code: string, body: Record<string, unknown>) =>
    request(app).post(`/api/v1/public/forms/${code}/submissions`).send(body);

  const waitlist = (
    email: string,
    overrides: Record<string, unknown> = {},
  ) => ({
    answers: [
      { questionCode: 'full_name', text: 'Nguyễn Văn Test' },
      { questionCode: 'email', text: email },
      { questionCode: 'profession', optionCodes: ['business_analysis'] },
    ],
    consents: ['contact'],
    context: { source: 'landing', locale: 'vi' },
    _hp: '',
    startedAt: Date.now() - 60_000,
    ...overrides,
  });

  const totalFor = (
    body: { forms: { formCode: string; total: number }[] },
    formCode: string,
  ) => body.forms.find((form) => form.formCode === formCode)?.total ?? 0;

  beforeAll(async () => {
    adminToken = await loginSeededSuperAdmin(app);
    plainUser = await login(app, PLAIN_EMAIL, PLAIN_PASSWORD);
  });

  it('should 401 an anonymous caller', async () => {
    await request(app).get('/api/v1/admin/forms/analytics/summary').expect(401);
  });

  it('should 403 a user without forms:analytics', async () => {
    const { body } = await request(app)
      .get('/api/v1/admin/forms/analytics/summary')
      .auth(plainUser.token, { type: 'bearer' })
      .expect(403);

    expect(body.required).toEqual({ module: 'forms', action: 'analytics' });
  });

  it('should return every active form, the range and the pipeline statuses', async () => {
    const { body } = await summary().expect(200);

    expect(body.range).toHaveProperty('from');
    expect(body.range).toHaveProperty('to');
    expect(body.previousRange).toHaveProperty('from');

    const codes = body.forms.map((form: { formCode: string }) => form.formCode);
    expect(codes).toEqual(
      expect.arrayContaining([
        'free_course_waitlist',
        'advanced_course_interest',
        'instructor_application',
      ]),
    );

    expect(body.byStatus.map((row: { status: string }) => row.status)).toEqual([
      'new',
      'reviewing',
      'contacted',
      'grouped',
      'approved',
      'rejected',
    ]);
  });

  it('should count new submissions and hold suspicious rows out of the total', async () => {
    const baseline = await summary().expect(200);
    const baseTotal = totalFor(baseline.body, 'free_course_waitlist');
    const baseSuspicious = baseline.body.suspiciousCount as number;

    for (const suffix of ['a', 'b', 'c']) {
      await submit(
        'free_course_waitlist',
        waitlist(uniqueEmail(`forms.analytics.${suffix}.${runId}`)),
      ).expect(201);
    }
    // A filled honeypot is stored and flagged, never rejected.
    await submit(
      'free_course_waitlist',
      waitlist(uniqueEmail(`forms.analytics.bot.${runId}`), { _hp: 'x' }),
    ).expect(201);

    const after = await summary().expect(200);
    const total = totalFor(after.body, 'free_course_waitlist');

    // Three count; the honeypot one does not, until asked for.
    expect(total).toBeGreaterThanOrEqual(baseTotal + 3);
    expect(after.body.suspiciousCount).toBeGreaterThanOrEqual(
      baseSuspicious + 1,
    );

    const withSuspicious = await summary('?includeSuspicious=true').expect(200);
    expect(
      totalFor(withSuspicious.body, 'free_course_waitlist'),
    ).toBeGreaterThanOrEqual(total + 1);
  });

  it('should 422 a range whose end is before its start', async () => {
    await summary('?from=2026-10-08&to=2026-07-10').expect(422);
  });

  it('should 422 a range longer than 731 days', async () => {
    await summary('?from=2020-01-01&to=2026-10-08').expect(422);
  });

  describe('timeseries', () => {
    const timeseries = (query = '') =>
      request(app)
        .get(`/api/v1/admin/forms/analytics/timeseries${query}`)
        .auth(adminToken, { type: 'bearer' });

    it('should bucket a 90-day range by week, every form in every point', async () => {
      const { body } = await timeseries().expect(200);

      expect(body.bucket).toBe('week');
      expect(Array.isArray(body.points)).toBe(true);
      expect(body.points.length).toBeGreaterThan(0);

      for (const point of body.points) {
        expect(typeof point.start).toBe('string');
        expect(point.byForm).toHaveProperty('free_course_waitlist');
        expect(point.byForm).toHaveProperty('advanced_course_interest');
        expect(point.byForm).toHaveProperty('instructor_application');
      }

      // The summary run above submitted three counted Form B rows; wherever
      // they land, the range total must include them.
      const waitlistTotal = body.points.reduce(
        (sum: number, point: { byForm: Record<string, number> }) =>
          sum + (point.byForm.free_course_waitlist ?? 0),
        0,
      );
      expect(waitlistTotal).toBeGreaterThanOrEqual(3);
    });

    it('should bucket a short range by day', async () => {
      const { body } = await timeseries(
        '?from=2026-10-01&to=2026-10-08',
      ).expect(200);
      expect(body.bucket).toBe('day');
      expect(body.points).toHaveLength(8);
    });
  });

  describe('questions', () => {
    const questions = (query: string) =>
      request(app)
        .get(`/api/v1/admin/forms/analytics/questions${query}`)
        .auth(adminToken, { type: 'bearer' });

    const countFor = (
      body: {
        questions: {
          code: string;
          options: { code: string; count: number }[];
        }[];
      },
      questionCode: string,
      optionCode: string,
    ) =>
      body.questions
        .find((question) => question.code === questionCode)
        ?.options.find((option) => option.code === optionCode)?.count ?? 0;

    const answeredFor = (
      body: { questions: { code: string; answered: number }[] },
      questionCode: string,
    ) =>
      body.questions.find((question) => question.code === questionCode)
        ?.answered ?? 0;

    it('should 404 an unknown form code', async () => {
      await questions('?formCode=not_a_form').expect(404);
    });

    it('should count options and answered per question', async () => {
      const baseline = await questions('?formCode=free_course_waitlist').expect(
        200,
      );
      const baseAnswered = answeredFor(baseline.body, 'profession');
      const baseBa = countFor(baseline.body, 'profession', 'business_analysis');
      const baseDa = countFor(baseline.body, 'profession', 'data_analytics');

      const payload = (email: string, optionCodes: string[]) => ({
        answers: [
          { questionCode: 'full_name', text: 'Nguyễn Văn Test' },
          { questionCode: 'email', text: email },
          { questionCode: 'profession', optionCodes },
        ],
        consents: ['contact'],
        context: { source: 'landing', locale: 'vi' },
        _hp: '',
        startedAt: Date.now() - 60_000,
      });

      await submit(
        'free_course_waitlist',
        payload(uniqueEmail(`forms.analytics.q1.${runId}`), [
          'business_analysis',
          'data_analytics',
        ]),
      ).expect(201);
      await submit(
        'free_course_waitlist',
        payload(uniqueEmail(`forms.analytics.q2.${runId}`), [
          'business_analysis',
        ]),
      ).expect(201);

      const after = await questions('?formCode=free_course_waitlist').expect(
        200,
      );
      expect(answeredFor(after.body, 'profession')).toBeGreaterThanOrEqual(
        baseAnswered + 2,
      );
      expect(
        countFor(after.body, 'profession', 'business_analysis'),
      ).toBeGreaterThanOrEqual(baseBa + 2);
      expect(
        countFor(after.body, 'profession', 'data_analytics'),
      ).toBeGreaterThanOrEqual(baseDa + 1);
    });

    it('should keep the drill question at its full distribution', async () => {
      const drilled = await questions(
        '?formCode=free_course_waitlist&fq=profession&fo=data_analytics',
      ).expect(200);

      // The drill question's own card is not narrowed: business_analysis
      // (from a submission that also chose data_analytics) still counts.
      expect(
        countFor(drilled.body, 'profession', 'business_analysis'),
      ).toBeGreaterThanOrEqual(1);

      // A different question is narrowed: its answered set cannot exceed the
      // drilled respondents.
      const referral = answeredFor(drilled.body, 'referral_source');
      expect(referral).toBeLessThanOrEqual(drilled.body.respondents);
    });

    it('should 422 a drill missing its option', async () => {
      await questions('?formCode=free_course_waitlist&fq=profession').expect(
        422,
      );
    });
  });
});
