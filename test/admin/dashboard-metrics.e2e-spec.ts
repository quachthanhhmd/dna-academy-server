import { Client } from 'pg';
import request from 'supertest';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  APP_URL,
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_PORT,
  DB_USER,
} from '../utils/constants';

const BASE = '/api/v1/admin/dashboard';

/** A window well clear of "now", so nothing else in the suite lands in it. */
const FROM = '2026-03-02';
const TO = '2026-03-08';
const WINDOW = `period=custom&from=${FROM}&to=${TO}`;

/** Vietnam midnight on a given day, as the UTC instant it actually is. */
const vn = (day: string, time = '00:00:00') =>
  new Date(`${day}T${time}+07:00`).toISOString();

const TAG = 'e2e-dash';

/**
 * Epic 7 BE-9 — the metric rules, against rows with exact timestamps.
 *
 * These go through SQL rather than the API because every rule here is about a
 * timestamp no endpoint lets a caller set: which Vietnam day an enrolment
 * lands on, which cohort a completion belongs to, what an unset
 * `enrollment_source` does. Creating the rows through HTTP would stamp them
 * `now()` and test nothing.
 *
 * Everything created is tagged and removed in `afterAll`, because this suite
 * shares its database with every other one.
 */
describe('Epic 7 — dashboard metrics', () => {
  const app = APP_URL;
  let db: Client;
  let token: string;
  let courseA: string;
  let courseB: string;
  let groupId: string;

  const get = async (path: string) => {
    const { body } = await request(app)
      .get(path)
      .auth(token, { type: 'bearer' })
      .expect(200);

    return body;
  };

  const addStudent = async (n: number): Promise<number> => {
    const { rows } = await db.query(
      `INSERT INTO "user" ("email", "full_name", "role_id", "locale")
       VALUES ($1, $2, 2, 'vi') RETURNING "id"`,
      [`${TAG}-${n}-${Date.now()}@example.com`, `Nguyễn Thị Hường ${n}`],
    );

    return rows[0].id;
  };

  const addCourse = async (title: string): Promise<string> => {
    const { rows } = await db.query(
      `INSERT INTO "course"
         ("title", "slug", "status", "language", "price", "is_free",
          "has_certificate", "enrollment_open", "total_sections",
          "total_lectures", "total_duration_secs", "total_enrollments")
       VALUES ($1, $2, 'published', 'vi', 0, true, false, true, 0, 0, 0, 0)
       RETURNING "id"`,
      [
        title,
        `${TAG}-${title}-${Date.now()}`.toLowerCase().replace(/\s+/g, '-'),
      ],
    );

    return rows[0].id;
  };

  const enrol = async (opts: {
    student: number;
    course: string;
    enrolledAt: string;
    status: string;
    progress: number;
    completedAt?: string | null;
    source?: string | null;
    lastAccessedAt?: string | null;
  }) => {
    await db.query(
      `INSERT INTO "enrollment"
         ("student_id", "course_id", "enrollment_date", "status",
          "progress_pct", "completed_at", "enrollment_source", "last_accessed_at")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        opts.student,
        opts.course,
        opts.enrolledAt,
        opts.status,
        opts.progress,
        opts.completedAt ?? null,
        opts.source ?? null,
        opts.lastAccessedAt ?? null,
      ],
    );
  };

  beforeAll(async () => {
    const login = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    token = login.body.token;

    db = new Client({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });
    await db.connect();

    courseA = await addCourse('Dash A');
    courseB = await addCourse('Dash B');

    // A group holding only course B, for the filter tests.
    const group = await db.query(
      // `name_translations` must carry the default locale — the table has a
      // CHECK for it (Epic 6), so a name alone is rejected.
      `INSERT INTO "master_data_code"
         ("group_id", "code", "name", "name_translations", "display_order", "is_active")
       SELECT g."id", $1, $1, $2::jsonb, 999, true
         FROM "master_data_group" g LIMIT 1
       RETURNING "id"`,
      [`${TAG}-group-${Date.now()}`, JSON.stringify({ vi: 'Nhóm kiểm thử' })],
    );
    groupId = group.rows[0].id;
    await db.query(
      `INSERT INTO "course_group_assignment" ("course_id", "group_id") VALUES ($1, $2)`,
      [courseB, groupId],
    );

    // A cohort of 10 on course A inside the window, 3 of which completed.
    for (let i = 0; i < 10; i += 1) {
      const student = await addStudent(i);
      const completed = i < 3;

      await enrol({
        student,
        course: courseA,
        enrolledAt: vn('2026-03-04', '10:00:00'),
        status: completed ? 'completed' : 'in_progress',
        progress: completed ? 100 : 40,
        completedAt: completed ? vn('2026-03-06', '10:00:00') : null,
        source: i % 2 === 0 ? 'organic' : null,
        lastAccessedAt: vn('2026-03-05', '10:00:00'),
      });
    }

    // An earlier cohort that completes *inside* the window. It must not lift
    // the window's cohort rate — that is the D2 trap.
    const earlier = await addStudent(90);
    await enrol({
      student: earlier,
      course: courseA,
      enrolledAt: vn('2026-01-10'),
      status: 'completed',
      progress: 100,
      completedAt: vn('2026-03-05', '09:00:00'),
      source: 'admin',
    });

    // Course B, for the filter tests.
    const bStudent = await addStudent(91);
    await enrol({
      student: bStudent,
      course: courseB,
      enrolledAt: vn('2026-03-04', '12:00:00'),
      status: 'in_progress',
      progress: 10,
      source: 'coupon',
    });

    // progress_pct = 100 but not yet `completed` — BE-3 says 76-99.
    const pending = await addStudent(92);
    await enrol({
      student: pending,
      course: courseB,
      enrolledAt: vn('2026-03-04', '13:00:00'),
      status: 'in_progress',
      progress: 100,
      source: 'organic',
    });
  });

  afterAll(async () => {
    if (!db) {
      return;
    }

    await db.query(
      `DELETE FROM "career_reflection_answer" WHERE "enrollment_id" IN (
         SELECT "id" FROM "enrollment" WHERE "course_id" IN ($1, $2))`,
      [courseA, courseB],
    );
    await db.query(`DELETE FROM "enrollment" WHERE "course_id" IN ($1, $2)`, [
      courseA,
      courseB,
    ]);
    await db.query(
      `DELETE FROM "course_group_assignment" WHERE "group_id" = $1`,
      [groupId],
    );
    await db.query(`DELETE FROM "master_data_code" WHERE "id" = $1`, [groupId]);
    await db.query(`DELETE FROM "course" WHERE "id" IN ($1, $2)`, [
      courseA,
      courseB,
    ]);
    await db.query(`DELETE FROM "user" WHERE "email" LIKE $1`, [`${TAG}-%`]);
    await db.end();
  });

  describe('timezone (AC-14)', () => {
    it('should count an enrolment at 17:30Z on the following Vietnam day', async () => {
      // 2026-03-12T17:30:00Z is 13/03 00:30 in Vietnam.
      const student = await addStudent(80);
      await enrol({
        student,
        course: courseA,
        enrolledAt: '2026-03-12T17:30:00.000Z',
        status: 'in_progress',
        progress: 5,
        source: 'organic',
      });

      const onThe13th = await get(
        `${BASE}/kpis?period=custom&from=2026-03-13&to=2026-03-13&courseId=${courseA}`,
      );
      const onThe12th = await get(
        `${BASE}/kpis?period=custom&from=2026-03-12&to=2026-03-12&courseId=${courseA}`,
      );

      expect(onThe13th.data.kpis.enrollments.value).toBe(1);
      expect(onThe12th.data.kpis.enrollments.value).toBe(0);

      await db.query(`DELETE FROM "enrollment" WHERE "student_id" = $1`, [
        student,
      ]);
    });

    it('should bucket that enrolment on the Vietnam day, not the UTC one', async () => {
      const student = await addStudent(81);
      await enrol({
        student,
        course: courseA,
        enrolledAt: '2026-03-12T17:30:00.000Z',
        status: 'in_progress',
        progress: 5,
        source: 'organic',
      });

      const body = await get(
        `${BASE}/enrollments-over-time?period=custom&from=2026-03-10&to=2026-03-14&courseId=${courseA}`,
      );
      const nonEmpty = body.data.buckets.filter(
        (b: { total: number }) => b.total > 0,
      );

      expect(nonEmpty).toHaveLength(1);
      expect(nonEmpty[0].bucket).toBe('2026-03-13');

      await db.query(`DELETE FROM "enrollment" WHERE "student_id" = $1`, [
        student,
      ]);
    });
  });

  describe('completion rate is cohort-based (D2, AC-15)', () => {
    it('should report 30 for a cohort of 10 with 3 completions', async () => {
      const body = await get(`${BASE}/kpis?${WINDOW}&courseId=${courseA}`);

      expect(body.data.kpis.completionRate.value).toBe(30);
    });

    it('should not be lifted by a completion belonging to an earlier cohort', async () => {
      // The January enrolment completed inside the window. A naive
      // "completions ÷ enrolments" would read 4/10 = 40%.
      const body = await get(`${BASE}/kpis?${WINDOW}&courseId=${courseA}`);

      expect(body.data.kpis.completionRate.value).toBe(30);
      expect(body.data.kpis.completedCourses.value).toBe(4);
    });

    it('should never exceed 100', async () => {
      const body = await get(`${BASE}/kpis?${WINDOW}`);

      expect(body.data.kpis.completionRate.value).toBeLessThanOrEqual(100);
    });

    it('should be null for an empty cohort, not zero', async () => {
      const body = await get(
        `${BASE}/kpis?period=custom&from=2026-02-01&to=2026-02-02&courseId=${courseA}`,
      );

      expect(body.data.kpis.completionRate.value).toBeNull();
    });
  });

  describe('progress buckets (AC-5)', () => {
    it('should be mutually exclusive and sum to the total', async () => {
      const body = await get(`${BASE}/progress-distribution?${WINDOW}`);
      const sum = body.data.buckets.reduce(
        (n: number, b: { count: number }) => n + b.count,
        0,
      );

      expect(sum).toBe(body.data.total);
      expect(body.data.buckets).toHaveLength(6);
    });

    it('should put a 100% row that is not yet completed in 76-99', async () => {
      const body = await get(
        `${BASE}/progress-distribution?${WINDOW}&courseId=${courseB}`,
      );
      const bucket = (key: string) =>
        body.data.buckets.find((b: { bucket: string }) => b.bucket === key)
          .count;

      expect(bucket('76-99')).toBe(1);
      expect(bucket('completed')).toBe(0);
    });

    it('should list exactly that row when the bucket is drilled into', async () => {
      const body = await get(
        `${BASE}/students?${WINDOW}&courseId=${courseB}&metric=progress_bucket&bucket=76-99`,
      );

      expect(body.data.total).toBe(1);
      expect(body.data.items[0].progressPct).toBe(100);
      expect(body.data.items[0].status).toBe('in_progress');
    });
  });

  describe('enrollment source (AC-4)', () => {
    it('should group a null source under unknown, not organic', async () => {
      const body = await get(
        `${BASE}/enrollments-over-time?${WINDOW}&courseId=${courseA}`,
      );
      const totals = body.data.buckets.reduce(
        (acc: Record<string, number>, b: Record<string, number>) => {
          for (const source of body.data.sources) {
            acc[source] = (acc[source] ?? 0) + Number(b[source] ?? 0);
          }

          return acc;
        },
        {},
      );

      // Five of the ten were seeded with no source at all.
      expect(totals.unknown).toBe(5);
      expect(totals.organic).toBe(5);
    });

    it('should always offer four series', async () => {
      const body = await get(`${BASE}/enrollments-over-time?${WINDOW}`);

      expect(body.data.sources).toEqual([
        'organic',
        'admin',
        'coupon',
        'unknown',
      ]);
    });
  });

  describe('filters narrow rather than widen (AC-2, AC-3)', () => {
    it('should isolate a course', async () => {
      const all = await get(`${BASE}/kpis?${WINDOW}`);
      const a = await get(`${BASE}/kpis?${WINDOW}&courseId=${courseA}`);

      expect(a.data.kpis.enrollments.value).toBe(10);
      expect(all.data.kpis.enrollments.value).toBeGreaterThan(
        a.data.kpis.enrollments.value,
      );
    });

    it('should aggregate a group', async () => {
      const body = await get(`${BASE}/kpis?${WINDOW}&groupId=${groupId}`);

      expect(body.data.kpis.enrollments.value).toBe(2);
    });

    it('should AND a course and a group rather than widening', async () => {
      // Course A is not in the group, so the intersection is empty.
      const body = await get(
        `${BASE}/kpis?${WINDOW}&courseId=${courseA}&groupId=${groupId}`,
      );

      expect(body.data.kpis.enrollments.value).toBe(0);
    });
  });

  /**
   * Epic 4.6 §6 — the reflection zone after the rework: a distribution per
   * selection question instead of a radar of category averages.
   */
  describe('reflection (Epic 4.6 §6)', () => {
    const Q1 = '4e6a0001-0000-4000-8000-000000000001';
    const Q2 = '4e6a0001-0000-4000-8000-000000000002';
    const Q4 = '4e6a0001-0000-4000-8000-000000000004';
    const Q5 = '4e6a0001-0000-4000-8000-000000000005';

    it('should report a response rate of 0 when nobody answered but people completed', async () => {
      const body = await get(
        `${BASE}/reflection?${WINDOW}&courseId=${courseA}`,
      );

      expect(body.data.responseRate).toEqual({
        rate: 0,
        responded: 0,
        completed: 4,
      });
    });

    it('should list every declared option with a null share before anyone answers', async () => {
      const body = await get(
        `${BASE}/reflection?${WINDOW}&courseId=${courseA}`,
      );
      const q2 = body.data.selections.find((q) => q.questionId === Q2);

      expect(q2.answered).toBe(0);
      expect(q2.responseShare).toBeNull();
      expect(q2.options.map((o) => [o.key, o.count, o.pct])).toEqual([
        [1, 0, null],
        [2, 0, null],
        [3, 0, null],
      ]);
    });

    describe('with answers', () => {
      beforeAll(async () => {
        // Three of course A's four in-window completions answer the form.
        const { rows } = await db.query(
          `SELECT "id" FROM "enrollment"
            WHERE "course_id" = $1 AND "status" = 'completed'
            ORDER BY "enrollment_date", "id" LIMIT 3`,
          [courseA],
        );
        const [e1, e2, e3] = rows.map((r) => r.id);
        const at = vn('2026-03-07', '12:00:00');
        const put = (
          enrollment: string,
          question: string,
          key: number | null,
          text: string | null,
        ) =>
          db.query(
            `INSERT INTO "career_reflection_answer"
               ("enrollment_id", "question_id", "rating_answer", "text_answer", "submitted_at")
             VALUES ($1, $2, $3, $4, $5)`,
            [enrollment, question, key, text, at],
          );

        await put(e1, Q2, 1, null);
        await put(e2, Q2, 1, null);
        await put(e3, Q2, 3, null);
        await put(e1, Q5, 2, null);
        await put(e1, Q1, null, 'Muốn thử sức với ngành này');
        await put(e2, Q1, null, 'Tìm hiểu nghề nghiệp phù hợp');
      });

      it('should count each option of a selection question', async () => {
        const body = await get(
          `${BASE}/reflection?${WINDOW}&courseId=${courseA}`,
        );
        const q2 = body.data.selections.find((q) => q.questionId === Q2);

        expect(q2.answered).toBe(3);
        expect(q2.options.map((o) => [o.key, o.count, o.pct])).toEqual([
          [1, 2, 66.7],
          [2, 0, 0],
          [3, 1, 33.3],
        ]);
      });

      it("should give each question its share of all responses (§6's Q2 share)", async () => {
        const body = await get(
          `${BASE}/reflection?${WINDOW}&courseId=${courseA}`,
        );
        const share = (id: string) =>
          body.data.selections.find((q) => q.questionId === id).responseShare;

        expect(body.data.totalResponses).toBe(3);
        expect(share(Q2)).toBe(100);
        expect(share(Q5)).toBe(33.3);
      });

      it('should compute the response rate from the same completions', async () => {
        const body = await get(
          `${BASE}/reflection?${WINDOW}&courseId=${courseA}`,
        );

        expect(body.data.responseRate).toEqual({
          rate: 75,
          responded: 3,
          completed: 4,
        });
      });

      it('should list the free-text questions with their answer counts', async () => {
        const body = await get(
          `${BASE}/reflection?${WINDOW}&courseId=${courseA}`,
        );
        const counts = Object.fromEntries(
          body.data.freeText.map((q) => [q.questionId, q.answered]),
        );

        expect(counts[Q1]).toBe(2);
        expect(counts[Q4]).toBe(0);
      });

      it('should offer no radar categories any more', async () => {
        const body = await get(
          `${BASE}/reflection?${WINDOW}&courseId=${courseA}`,
        );

        expect(body.data).not.toHaveProperty('categories');
      });

      it('should filter the written responses by question (F)', async () => {
        const purpose = await get(
          `${BASE}/reflection/comments?${WINDOW}&courseId=${courseA}&questionId=${Q1}`,
        );
        const feedback = await get(
          `${BASE}/reflection/comments?${WINDOW}&courseId=${courseA}&questionId=${Q4}`,
        );

        expect(purpose.data.total).toBe(2);
        expect(purpose.data.items[0]).toMatchObject({
          questionId: Q1,
          questionOrder: 1,
          courseTitle: 'Dash A',
        });
        expect(feedback.data.total).toBe(0);
      });

      it('should leave another course out of a course-filtered view', async () => {
        const body = await get(
          `${BASE}/reflection?${WINDOW}&courseId=${courseB}`,
        );

        expect(body.data.totalResponses).toBe(0);
      });

      it('should export the distributions as CSV, one row per option', async () => {
        const res = await request(app)
          .get(
            `${BASE}/export?format=csv&dataset=reflection&${WINDOW}&courseId=${courseA}`,
          )
          .auth(token, { type: 'bearer' })
          .expect(200);

        expect(res.text).toContain(
          'Question,Option,Answers,Share of question (%)',
        );
        expect(res.text).toContain('Chưa hiểu rõ nội dung khóa học lắm');
      });
    });
  });

  describe('empty windows (AC-9)', () => {
    it('should return empty arrays rather than a zero-filled series', async () => {
      const q = `period=custom&from=2026-02-01&to=2026-02-03&courseId=${courseA}`;
      const series = await get(`${BASE}/enrollments-over-time?${q}`);
      const progress = await get(`${BASE}/progress-distribution?${q}`);
      const status = await get(`${BASE}/enrollment-status?${q}`);

      expect(series.data.buckets).toEqual([]);
      expect(series.data.total).toBe(0);
      expect(progress.data.buckets).toEqual([]);
      expect(status.data.statuses).toEqual([]);
    });
  });

  describe('drill-down matches the card it came from (AC-6)', () => {
    it('should list the completed enrolments the KPI counted', async () => {
      const kpis = await get(`${BASE}/kpis?${WINDOW}&courseId=${courseA}`);
      const drawer = await get(
        `${BASE}/students?${WINDOW}&courseId=${courseA}&metric=completed`,
      );

      expect(drawer.data.total).toBe(kpis.data.kpis.completedCourses.value);
    });

    it('should page without changing the total', async () => {
      const first = await get(
        `${BASE}/students?${WINDOW}&courseId=${courseA}&limit=3&page=1`,
      );
      const second = await get(
        `${BASE}/students?${WINDOW}&courseId=${courseA}&limit=3&page=2`,
      );

      expect(first.data.items).toHaveLength(3);
      expect(first.data.total).toBe(second.data.total);
      expect(first.data.items[0].studentId).not.toBe(
        second.data.items[0].studentId,
      );
    });
  });

  describe('top courses', () => {
    it('should rank by enrolments and carry each course its own rate', async () => {
      const body = await get(`${BASE}/top-courses?${WINDOW}`);
      const a = body.data.courses.find(
        (c: { courseId: string }) => c.courseId === courseA,
      );

      expect(a.enrollments).toBe(10);
      expect(a.completionRate).toBe(30);
      expect(body.data.courses.length).toBeLessThanOrEqual(10);
    });
  });

  describe('CSV carries Vietnamese intact (AC-7)', () => {
    it('should round-trip a name with stacked diacritics', async () => {
      const res = await request(app)
        .get(
          `${BASE}/export?format=csv&dataset=students&${WINDOW}&courseId=${courseA}`,
        )
        .auth(token, { type: 'bearer' })
        .expect(200);

      expect(res.text).toContain('Nguyễn Thị Hường');
    });
  });
});
