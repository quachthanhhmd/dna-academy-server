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

  describe('crosstab', () => {
    const crosstab = (query: string) =>
      request(app)
        .get(`/api/v1/admin/forms/analytics/crosstab${query}`)
        .auth(adminToken, { type: 'bearer' });

    const advanced = (email: string) => ({
      answers: [
        { questionCode: 'full_name', text: 'Nguyễn Văn Test' },
        { questionCode: 'email', text: email },
        { questionCode: 'phone', text: '0901234567' },
        { questionCode: 'current_level', optionCodes: ['self_taught'] },
        { questionCode: 'profession', optionCodes: ['data_analytics'] },
        { questionCode: 'session_slot', optionCodes: ['weekday_evening'] },
        { questionCode: 'time_band', optionCodes: ['slot_19_21'] },
        { questionCode: 'learning_goal', optionCodes: ['upskill'] },
      ],
      consents: ['zoom_format', 'contact'],
      context: { source: 'certificate', locale: 'vi' },
      _hp: '',
      startedAt: Date.now() - 60_000,
    });

    const cellOf = (
      body: {
        row: { options: { code: string }[] };
        col: { options: { code: string }[] };
        cells: number[][];
      },
      rowCode: string,
      colCode: string,
    ) => {
      const i = body.row.options.findIndex((o) => o.code === rowCode);
      const j = body.col.options.findIndex((o) => o.code === colCode);
      return i >= 0 && j >= 0 ? body.cells[i][j] : 0;
    };

    const QUERY =
      '?formCode=advanced_course_interest&row=session_slot&col=time_band';

    it('should 401 an anonymous caller', async () => {
      await request(app)
        .get('/api/v1/admin/forms/analytics/crosstab')
        .expect(401);
    });

    it('should 422 a non-select or repeated axis', async () => {
      await crosstab(
        '?formCode=advanced_course_interest&row=full_name&col=time_band',
      ).expect(422);
      await crosstab(
        '?formCode=advanced_course_interest&row=time_band&col=time_band',
      ).expect(422);
    });

    it('should zero-fill the matrix in allowlist order', async () => {
      const { body } = await crosstab(QUERY).expect(200);
      expect(body.row.code).toBe('session_slot');
      expect(body.col.code).toBe('time_band');
      expect(body.cells).toHaveLength(body.row.options.length);
      for (const row of body.cells) {
        expect(row).toHaveLength(body.col.options.length);
      }
    });

    it('should count the two-axis cell as a delta', async () => {
      const baseline = await crosstab(QUERY).expect(200);
      const base = cellOf(baseline.body, 'weekday_evening', 'slot_19_21');

      await submit(
        'advanced_course_interest',
        advanced(uniqueEmail(`forms.xtab.a.${runId}`)),
      ).expect(201);
      await submit(
        'advanced_course_interest',
        advanced(uniqueEmail(`forms.xtab.b.${runId}`)),
      ).expect(201);

      const after = await crosstab(QUERY).expect(200);
      expect(
        cellOf(after.body, 'weekday_evening', 'slot_19_21'),
      ).toBeGreaterThanOrEqual(base + 2);
      expect(after.body.respondents).toBeGreaterThanOrEqual(2);
    });
  });

  describe('supply-demand', () => {
    const supplyDemand = (query = '') =>
      request(app)
        .get(`/api/v1/admin/forms/analytics/supply-demand${query}`)
        .auth(adminToken, { type: 'bearer' });

    const instructor = (
      email: string,
      overrides: Record<string, unknown> = {},
    ) => ({
      answers: [
        { questionCode: 'full_name', text: 'Trần Thị Test' },
        { questionCode: 'email', text: email },
        { questionCode: 'phone', text: '0901234567' },
        { questionCode: 'profession', optionCodes: ['business_analysis'] },
        { questionCode: 'experience_years', optionCodes: ['3_5'] },
        { questionCode: 'taught_before', optionCodes: ['yes'] },
        { questionCode: 'contribution_mode', optionCodes: ['teach'] },
        {
          questionCode: 'experiences_to_design',
          text: 'Quy trình nghiệp vụ thực tế của tôi.',
        },
      ],
      consents: ['contact'],
      context: { source: 'landing', locale: 'vi' },
      _hp: '',
      startedAt: Date.now() - 60_000,
      ...overrides,
    });

    const rowFor = (
      body: { rows: { code: string; demand: number; supply: number }[] },
      code: string,
    ) => body.rows.find((row) => row.code === code);

    it('should 401 an anonymous caller', async () => {
      await request(app)
        .get('/api/v1/admin/forms/analytics/supply-demand')
        .expect(401);
    });

    it('should list every field with a name and both numbers', async () => {
      const { body } = await supplyDemand().expect(200);
      const codes = body.rows.map((row: { code: string }) => row.code);
      expect(codes).toEqual(
        expect.arrayContaining([
          'data_analytics',
          'business_analysis',
          'other',
        ]),
      );

      for (const row of body.rows) {
        expect(typeof row.name).toBe('string');
        expect(row.name.length).toBeGreaterThan(0);
        expect(typeof row.demand).toBe('number');
        expect(typeof row.supply).toBe('number');
      }
    });

    it('should count a learner pick as demand and an instructor pick as supply', async () => {
      const baseline = await supplyDemand().expect(200);
      const base = rowFor(baseline.body, 'business_analysis');
      const baseDemand = base?.demand ?? 0;
      const baseSupply = base?.supply ?? 0;

      await submit(
        'free_course_waitlist',
        waitlist(uniqueEmail(`forms.sd.demand.${runId}`)),
      ).expect(201);
      await submit(
        'instructor_application',
        instructor(uniqueEmail(`forms.sd.supply.${runId}`)),
      ).expect(201);

      const after = await supplyDemand().expect(200);
      const row = rowFor(after.body, 'business_analysis');
      expect(row?.demand).toBeGreaterThanOrEqual(baseDemand + 1);
      expect(row?.supply).toBeGreaterThanOrEqual(baseSupply + 1);
    });

    it('should ignore a learner drill so instructor supply is not hidden', async () => {
      const plain = await supplyDemand().expect(200);
      const drilled = await supplyDemand(
        '?fq=profession&fo=data_analytics',
      ).expect(200);
      expect(drilled.body.rows).toEqual(plain.body.rows);
    });
  });

  describe('texts and themes', () => {
    const texts = (query: string) =>
      request(app)
        .get(`/api/v1/admin/forms/analytics/texts${query}`)
        .auth(adminToken, { type: 'bearer' });

    const tag = (
      answerId: string,
      themeCode: string | null,
      token = adminToken,
    ) =>
      request(app)
        .patch(`/api/v1/admin/forms/analytics/answers/${answerId}/theme`)
        .auth(token, { type: 'bearer' })
        .send({ themeCode });

    const challenge = (email: string, text: string) => ({
      answers: [
        { questionCode: 'full_name', text: 'Nguyễn Văn Test' },
        { questionCode: 'email', text: email },
        { questionCode: 'profession', optionCodes: ['business_analysis'] },
        { questionCode: 'biggest_challenge', text },
      ],
      consents: ['contact'],
      context: { source: 'landing', locale: 'vi' },
      _hp: '',
      startedAt: Date.now() - 60_000,
    });

    const BASE =
      '?formCode=free_course_waitlist&questionCode=biggest_challenge';

    it('should 401 an anonymous caller', async () => {
      await request(app).get('/api/v1/admin/forms/analytics/texts').expect(401);
    });

    it('should 422 a question that is not a text question', async () => {
      await texts(
        '?formCode=free_course_waitlist&questionCode=profession',
      ).expect(422);
    });

    it('should search, tag and filter, and guard the write', async () => {
      const email = uniqueEmail(`forms.texts.flow.${runId}`);
      await submit(
        'free_course_waitlist',
        challenge(email, 'Không có thời gian luyện SQL'),
      ).expect(201);

      const found = await texts(`${BASE}&q=sql`).expect(200);
      // G5: the feed never returns the submitter's e-mail.
      expect(JSON.stringify(found.body)).not.toContain(email);

      const item = found.body.data.find((row: { text: string }) =>
        row.text.includes('luyện SQL'),
      );
      expect(item).toBeTruthy();

      await tag(item.answerId, 'time').expect(200);

      const tagged = await texts(`${BASE}&theme=time`).expect(200);
      expect(
        tagged.body.data.some(
          (row: { answerId: string }) => row.answerId === item.answerId,
        ),
      ).toBe(true);
      const timeTheme = tagged.body.themes.find(
        (row: { code: string }) => row.code === 'time',
      );
      expect(timeTheme.count).toBeGreaterThanOrEqual(1);

      await tag(item.answerId, 'not_a_theme').expect(422);
      await tag(item.answerId, 'time', plainUser.token).expect(403);
    });
  });

  describe('respondents', () => {
    const respondents = (query: string) =>
      request(app)
        .get(`/api/v1/admin/forms/analytics/respondents${query}`)
        .auth(adminToken, { type: 'bearer' });

    const FORM = '?formCode=free_course_waitlist';

    it('should 401 an anonymous caller', async () => {
      await request(app)
        .get('/api/v1/admin/forms/analytics/respondents')
        .expect(401);
    });

    it('should 403 a user without forms:analytics', async () => {
      await request(app)
        .get(`/api/v1/admin/forms/analytics/respondents${FORM}`)
        .auth(plainUser.token, { type: 'bearer' })
        .expect(403);
    });

    it('should page the respondents and cap the limit', async () => {
      const first = await respondents(`${FORM}&limit=2`).expect(200);
      expect(first.body.limit).toBe(2);
      expect(first.body.total).toBeGreaterThanOrEqual(first.body.data.length);

      if (first.body.hasNextPage) {
        const second = await respondents(`${FORM}&limit=2&page=2`).expect(200);
        expect(second.body.page).toBe(2);
        expect(second.body.data[0].submissionId).not.toBe(
          first.body.data[0].submissionId,
        );
      }

      // The DTO rejects a limit above 100 (validation maps to 422 here).
      await respondents(`${FORM}&limit=1000`).expect(422);
    });

    it('should return only the requested metric slice', async () => {
      const all = await respondents(`${FORM}&limit=100`).expect(200);
      const fresh = await respondents(`${FORM}&metric=new&limit=100`).expect(
        200,
      );
      expect(
        fresh.body.data.every(
          (row: { status: string }) => row.status === 'new',
        ),
      ).toBe(true);
      expect(fresh.body.total).toBeLessThanOrEqual(all.body.total);

      const consent = await respondents(
        `${FORM}&metric=consent&limit=100`,
      ).expect(200);
      expect(consent.body.total).toBeLessThanOrEqual(all.body.total);
    });
  });

  describe('export', () => {
    const url = (query = '') =>
      `/api/v1/admin/forms/analytics/export.xlsx${query}`;

    it('should 401 an anonymous caller', async () => {
      await request(app).get(url()).expect(401);
    });

    it('should 403 a user without forms:export', async () => {
      await request(app)
        .get(url())
        .auth(plainUser.token, { type: 'bearer' })
        .expect(403);
    });

    it('should return an xlsx for the overview and for a form', async () => {
      for (const query of ['', '?formCode=free_course_waitlist']) {
        const res = await request(app)
          .get(url(query))
          .auth(adminToken, { type: 'bearer' })
          .buffer(true)
          .parse((response, callback) => {
            const chunks: Buffer[] = [];
            response.on('data', (chunk: Buffer) => chunks.push(chunk));
            response.on('end', () => callback(null, Buffer.concat(chunks)));
          });

        expect(res.status).toBe(200);
        expect(String(res.headers['content-type'])).toContain('spreadsheetml');
        // An xlsx is a zip: the local file header magic is "PK".
        expect((res.body as Buffer).subarray(0, 2).toString('latin1')).toBe(
          'PK',
        );
      }
    });
  });
});
