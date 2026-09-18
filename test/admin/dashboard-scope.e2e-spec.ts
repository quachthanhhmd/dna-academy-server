import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { Client } from 'pg';
import { APP_URL } from '../utils/constants';
import { INSTRUCTOR_ROLE_ID, loginSeededSuperAdmin } from '../utils/admin';
import { Account, createCourse, registerAndLogin } from '../utils/fixtures';
import { connectDb } from '../utils/db';

/**
 * Permission model §1.9 (BE-12) — an instructor's dashboard counts only the
 * courses they are primary on (R3, D8), and never shows student-level rows.
 */
describe('Dashboard scope (§1.9)', () => {
  const app = APP_URL;
  let db: Client;
  let adminToken: string;

  let primary: Account;
  let coOnly: Account;
  let idle: Account;
  let ownCourse: string;
  let coCourse: string;
  let otherCourse: string;

  const kpis = (token: string, query = '') =>
    request(app)
      .get(`/api/v1/admin/dashboard/kpis?period=30d${query}`)
      .auth(token, { type: 'bearer' });

  const makeInstructor = async (label: string) => {
    const account = await registerAndLogin(app, label);
    const { body } = await request(app)
      .put(`/api/v1/admin/users/${account.userId}/roles`)
      .auth(adminToken, { type: 'bearer' })
      .send({ roleId: INSTRUCTOR_ROLE_ID })
      .expect(200);
    await request(app)
      .patch(`/api/v1/admin/instructors/${body.instructorId}/status`)
      .auth(adminToken, { type: 'bearer' })
      .send({ isActive: true })
      .expect(200);
    return { account, profileId: body.instructorId as string };
  };

  const enrol = async (courseId: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const learner = await registerAndLogin(app, 'ds.learner');
      await db.query(
        `INSERT INTO "enrollment" ("student_id", "course_id", "enrollment_date",
                                   "status", "progress_pct")
         VALUES ($1, $2, now() - interval '1 day', 'in_progress', 10)`,
        [learner.userId, courseId],
      );
    }
  };

  beforeAll(async () => {
    db = await connectDb();
    adminToken = await loginSeededSuperAdmin(app);

    const p = await makeInstructor('ds.primary');
    const c = await makeInstructor('ds.co');
    const i = await makeInstructor('ds.idle');
    const other = await makeInstructor('ds.other');
    primary = p.account;
    coOnly = c.account;
    idle = i.account;

    ownCourse = await createCourse(app, adminToken, {
      primaryInstructorId: p.profileId,
    });
    coCourse = await createCourse(app, adminToken, {
      primaryInstructorId: other.profileId,
      coInstructorIds: [c.profileId],
    });
    otherCourse = await createCourse(app, adminToken);

    await enrol(ownCourse, 2);
    await enrol(coCourse, 3);
    await enrol(otherCourse, 4);
  });

  afterAll(async () => {
    await db.end();
  });

  // AC-18
  it('should count only the primary instructor’s own courses', async () => {
    const { body } = await kpis(primary.token).expect(200);

    expect(body.meta.scope).toBe('own');
    expect(body.data.kpis.enrollments.value).toBe(2);
  });

  it('should count registered students as those enrolled in own courses', async () => {
    const { body } = await kpis(primary.token).expect(200);

    expect(body.data.kpis.registeredStudents.value).toBe(2);
  });

  it('should scope the charts too', async () => {
    const { body } = await request(app)
      .get('/api/v1/admin/dashboard/top-courses?period=30d')
      .auth(primary.token, { type: 'bearer' })
      .expect(200);

    expect(body.meta.scope).toBe('own');
    expect(
      body.data.courses.map((c: { courseId: string }) => c.courseId),
    ).toEqual([ownCourse]);
  });

  // D8 — co-instructors are excluded from dashboard scope.
  it('should count nothing for a course the caller only co-teaches', async () => {
    const { body } = await kpis(coOnly.token).expect(200);

    expect(body.data.kpis.enrollments.value).toBe(0);
  });

  // AC-20 — the ordinary empty shape, never platform totals.
  it('should return empty numbers for an instructor primary on nothing', async () => {
    const { body } = await kpis(idle.token).expect(200);

    expect(body.meta.scope).toBe('own');
    expect(body.data.kpis.enrollments.value).toBe(0);
    expect(body.data.kpis.registeredStudents.value).toBe(0);
  });

  it('should 404 a course filter outside the caller’s scope', () =>
    kpis(primary.token, `&courseId=${otherCourse}`).expect(404));

  it('should accept a course filter inside the caller’s scope', async () => {
    const { body } = await kpis(primary.token, `&courseId=${ownCourse}`).expect(
      200,
    );

    expect(body.data.kpis.enrollments.value).toBe(2);
  });

  it('should show everything, marked all, to an admin', async () => {
    const { body } = await kpis(adminToken).expect(200);

    expect(body.meta.scope).toBe('all');
    expect(body.data.kpis.enrollments.value).toBeGreaterThanOrEqual(9);
  });

  // AC-19
  describe('student-level data', () => {
    it.each([
      ['students', 'dashboard', 'view_students'],
      ['reflection/comments', 'dashboard', 'view_students'],
      ['export?dataset=students&format=csv', 'dashboard', 'export'],
    ])('should refuse /%s to an instructor', async (path, module, action) => {
      const { body } = await request(app)
        .get(`/api/v1/admin/dashboard/${path}`)
        .auth(primary.token, { type: 'bearer' })
        .expect(403);

      expect(body.required).toEqual({ module, action });
    });

    // The export would otherwise hand out the rows /students guards.
    describe('export without dashboard:view_students', () => {
      let exporterToken: string;

      beforeAll(async () => {
        const exporter = await registerAndLogin(app, 'ds.exporter');
        const { body: role } = await request(app)
          .post('/api/v1/admin/roles')
          .auth(adminToken, { type: 'bearer' })
          .send({ name: `DS exporter ${Date.now()}` })
          .expect(201);
        const { body: matrix } = await request(app)
          .get(`/api/v1/admin/roles/${role.id}/permissions`)
          .auth(adminToken, { type: 'bearer' })
          .expect(200);
        const dashboard = matrix.find(
          (m: { module: { name: string } }) => m.module.name === 'dashboard',
        );
        await request(app)
          .put(`/api/v1/admin/roles/${role.id}/permissions`)
          .auth(adminToken, { type: 'bearer' })
          .send({
            permissionIds: dashboard.permissions
              .filter((p: { action: string }) =>
                ['view', 'export'].includes(p.action),
              )
              .map((p: { id: string }) => p.id),
          })
          .expect(200);
        await request(app)
          .put(`/api/v1/admin/users/${exporter.userId}/roles`)
          .auth(adminToken, { type: 'bearer' })
          .send({ roleId: role.id })
          .expect(200);
        exporterToken = exporter.token;
      });

      it.each(['students', 'reflection-comments'])(
        'should refuse the %s dataset',
        async (dataset) => {
          const { body } = await request(app)
            .get(
              `/api/v1/admin/dashboard/export?dataset=${dataset}&format=csv&period=30d`,
            )
            .auth(exporterToken, { type: 'bearer' })
            .expect(403);

          expect(body.required).toEqual({
            module: 'dashboard',
            action: 'view_students',
          });
        },
      );

      it('should still export an aggregate dataset', () =>
        request(app)
          .get(
            '/api/v1/admin/dashboard/export?dataset=kpis&format=csv&period=30d',
          )
          .auth(exporterToken, { type: 'bearer' })
          .expect(200));
    });

    it('should serve /students to an admin', () =>
      request(app)
        .get('/api/v1/admin/dashboard/students?period=30d')
        .auth(adminToken, { type: 'bearer' })
        .expect(200));
  });
});
