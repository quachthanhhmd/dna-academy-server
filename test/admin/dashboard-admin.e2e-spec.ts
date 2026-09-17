import request from 'supertest';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  APP_URL,
  TESTER_EMAIL,
  TESTER_PASSWORD,
} from '../utils/constants';

const BASE = '/api/v1/admin/dashboard';

const ENDPOINTS = [
  'kpis',
  'enrollments-over-time',
  'progress-distribution',
  'top-courses',
  'enrollment-status',
  'reflection',
  'reflection/comments',
  'students',
];

/** Epic 7 §1 and BE-9 — the contract every zone shares. */
describe('Epic 7 — Admin dashboard', () => {
  const app = APP_URL;
  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    const admin = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    adminToken = admin.body.token;

    const student = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email: TESTER_EMAIL, password: TESTER_PASSWORD });
    studentToken = student.body.token;
  });

  describe('permissions (AC-13)', () => {
    it.each(ENDPOINTS)(
      'should reject a user without dashboard:view on /%s',
      async (endpoint) => {
        await request(app)
          .get(`${BASE}/${endpoint}`)
          .auth(studentToken, { type: 'bearer' })
          .expect(403);
      },
    );

    it('should reject the drill-down too, since hiding the UI is not the control', async () => {
      await request(app)
        .get(`${BASE}/students`)
        .auth(studentToken, { type: 'bearer' })
        .expect(403);
    });

    it('should reject an unauthenticated request', async () => {
      await request(app).get(`${BASE}/kpis`).expect(401);
    });

    it('should reject export without the permission', async () => {
      await request(app)
        .get(`${BASE}/export?format=csv&dataset=top-courses`)
        .auth(studentToken, { type: 'bearer' })
        .expect(403);
    });

    it.each(ENDPOINTS)('should allow an admin on /%s', async (endpoint) => {
      await request(app)
        .get(`${BASE}/${endpoint}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);
    });
  });

  describe('envelope (§1.1)', () => {
    it('should echo the resolved window with its offset', async () => {
      const { body } = await request(app)
        .get(`${BASE}/kpis?period=30d`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      expect(body.meta.timezone).toBe('Asia/Ho_Chi_Minh');
      expect(body.meta.period.from).toMatch(
        /^\d{4}-\d{2}-\d{2}T00:00:00\+07:00$/,
      );
      expect(body.meta.period.to).toMatch(
        /^\d{4}-\d{2}-\d{2}T23:59:59\+07:00$/,
      );
      expect(body.meta.courseId).toBeNull();
      expect(body.meta.groupId).toBeNull();
      expect(body.meta.generatedAt).toEqual(expect.any(String));
    });

    it('should span exactly 30 Vietnam days for 30d', async () => {
      const { body } = await request(app)
        .get(`${BASE}/kpis?period=30d`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      const from = new Date(body.meta.period.from);
      const to = new Date(body.meta.period.to);
      // from is 00:00:00 and to is 23:59:59 on the 30th day, so the span is
      // one second short of 30 whole days.
      const days = (to.getTime() - from.getTime()) / 86_400_000;

      expect(days).toBeCloseTo(30, 3);
    });

    it('should echo the filters it was given', async () => {
      const courseId = '11111111-1111-4111-8111-111111111111';
      const { body } = await request(app)
        .get(`${BASE}/kpis?courseId=${courseId}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      expect(body.meta.courseId).toBe(courseId);
    });

    it('should return all seven KPIs with the delta and series shape', async () => {
      const { body } = await request(app)
        .get(`${BASE}/kpis`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      const keys = Object.keys(body.data.kpis);

      expect(keys).toEqual([
        'registeredStudents',
        'activeStudents',
        'enrollments',
        'completedCourses',
        'completionRate',
        'avgProgress',
        'avgRating',
      ]);

      for (const key of keys) {
        // Every field may legitimately be null (§1.3 — an absence is not a
        // zero), so this asserts the shape, not the presence of a value.
        const kpi = body.data.kpis[key];

        expect(Object.keys(kpi).sort()).toEqual(['delta', 'series', 'value']);
        expect(Object.keys(kpi.delta).sort()).toEqual([
          'current',
          'pct',
          'previous',
        ]);
        expect(Array.isArray(kpi.series)).toBe(true);
      }
    });
  });

  describe('period validation', () => {
    it('should reject custom without dates', async () => {
      await request(app)
        .get(`${BASE}/kpis?period=custom`)
        .auth(adminToken, { type: 'bearer' })
        .expect(422);
    });

    it('should reject a malformed date', async () => {
      await request(app)
        .get(`${BASE}/kpis?period=custom&from=15-08-2026&to=2026-09-13`)
        .auth(adminToken, { type: 'bearer' })
        .expect(422);
    });

    it('should reject a range that runs backwards', async () => {
      await request(app)
        .get(`${BASE}/kpis?period=custom&from=2026-09-13&to=2026-08-15`)
        .auth(adminToken, { type: 'bearer' })
        .expect(422);
    });

    it('should reject an unknown period', async () => {
      await request(app)
        .get(`${BASE}/kpis?period=forever`)
        .auth(adminToken, { type: 'bearer' })
        .expect(422);
    });

    it('should reject a limit above the cap', async () => {
      await request(app)
        .get(`${BASE}/students?limit=500`)
        .auth(adminToken, { type: 'bearer' })
        .expect(422);
    });

    it('should reject progress_bucket without a bucket', async () => {
      await request(app)
        .get(`${BASE}/students?metric=progress_bucket`)
        .auth(adminToken, { type: 'bearer' })
        .expect(422);
    });
  });

  describe('drill-down does not leak (§1.4)', () => {
    it('should never return credentials or social ids', async () => {
      const { body } = await request(app)
        .get(`${BASE}/students`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      const serialised = JSON.stringify(body);

      expect(serialised).not.toMatch(/password/i);
      expect(serialised).not.toMatch(/socialId|social_id/i);

      for (const row of body.data.items) {
        expect(Object.keys(row).sort()).toEqual([
          'completedAt',
          'courseTitle',
          'email',
          'enrollmentDate',
          'fullName',
          'progressPct',
          'status',
          'studentId',
        ]);
      }
    });
  });

  describe('export (BE-6, AC-7)', () => {
    it('should return CSV with a UTF-8 BOM so Excel reads Vietnamese', async () => {
      const res = await request(app)
        .get(`${BASE}/export?format=csv&dataset=top-courses`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200)
        .buffer()
        .parse((r, cb) => {
          const chunks: Buffer[] = [];
          r.on('data', (c: Buffer) => chunks.push(c));
          r.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      const body = res.body as Buffer;

      expect(body.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
      expect(res.headers['content-type']).toContain('text/csv');
    });

    it('should name the file after the dataset and the resolved window', async () => {
      const res = await request(app)
        .get(`${BASE}/export?format=csv&dataset=students&period=30d`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="dashboard-students-\d{8}-\d{8}\.csv"/,
      );
    });

    it('should refuse the overview as CSV, which is charts and scalars', async () => {
      await request(app)
        .get(`${BASE}/export?format=csv&dataset=overview`)
        .auth(adminToken, { type: 'bearer' })
        .expect(422);
    });

    it('should reject an unknown dataset', async () => {
      await request(app)
        .get(`${BASE}/export?format=csv&dataset=everything`)
        .auth(adminToken, { type: 'bearer' })
        .expect(422);
    });
  });

  describe('export PDF (BE-7)', () => {
    const pdf = (dataset: string) =>
      request(app)
        .get(`${BASE}/export?format=pdf&dataset=${dataset}`)
        .auth(adminToken, { type: 'bearer' })
        .buffer()
        .parse((r, cb) => {
          const chunks: Buffer[] = [];
          r.on('data', (c: Buffer) => chunks.push(c));
          r.on('end', () => cb(null, Buffer.concat(chunks)));
        });

    it('should render the overview as a real PDF', async () => {
      const res = await pdf('overview').expect(200);
      const body = res.body as Buffer;

      expect(res.headers['content-type']).toContain('application/pdf');
      expect(body.subarray(0, 5).toString()).toBe('%PDF-');
      expect(body.length).toBeGreaterThan(1000);
    });

    it('should render a single dataset as a PDF table', async () => {
      const res = await pdf('top-courses').expect(200);

      expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    });
  });
});
