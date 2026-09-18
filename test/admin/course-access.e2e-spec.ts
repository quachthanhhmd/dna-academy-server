import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { Client } from 'pg';
import { APP_URL } from '../utils/constants';
import {
  INSTRUCTOR_ROLE_ID,
  loginSeededSuperAdmin,
  setUserRole,
} from '../utils/admin';
import { Account, createCourse, registerAndLogin } from '../utils/fixtures';
import { connectDb } from '../utils/db';

/**
 * Permission model §1.8 / §2.7 (BE-10) — instructors reach their own courses
 * and nothing else; co-instructors only read (R4).
 */
describe('Course access (§2.7)', () => {
  const app = APP_URL;
  let db: Client;
  let adminToken: string;

  let primary: Account;
  let co: Account;
  let outsider: Account;
  let editor: Account;
  let outsiderProfile: string;

  let courseA: string;
  let courseB: string;
  let sectionA: string;
  let lectureA: string;

  const as = (account: Account | string) =>
    typeof account === 'string' ? account : account.token;

  const call = (
    method: 'get' | 'patch' | 'post' | 'put' | 'delete',
    path: string,
    who: Account | string,
    body?: object,
  ) => {
    const req = request(app)
      [method](`/api/v1${path}`)
      .auth(as(who), { type: 'bearer' });
    return body ? req.send(body) : req;
  };

  /** A learner turned Instructor, with an active profile. */
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

  const grantCustomRole = async (account: Account, keys: string[]) => {
    const { body: role } = await call('post', '/admin/roles', adminToken, {
      name: `CA role ${Date.now()}`,
    }).expect(201);
    const { body: matrix } = await call(
      'get',
      `/admin/roles/${role.id}/permissions`,
      adminToken,
    ).expect(200);
    const ids = (
      matrix as {
        module: { name: string };
        permissions: { id: string; action: string }[];
      }[]
    ).flatMap((group) =>
      group.permissions
        .filter((p) => keys.includes(`${group.module.name}:${p.action}`))
        .map((p) => p.id),
    );
    await call('put', `/admin/roles/${role.id}/permissions`, adminToken, {
      permissionIds: ids,
    }).expect(200);
    await setUserRole(app, adminToken, account.userId, role.id);
  };

  beforeAll(async () => {
    db = await connectDb();
    adminToken = await loginSeededSuperAdmin(app);

    const p = await makeInstructor('ca.primary');
    const c = await makeInstructor('ca.co');
    const o = await makeInstructor('ca.outsider');
    primary = p.account;
    co = c.account;
    outsider = o.account;
    outsiderProfile = o.profileId;

    editor = await registerAndLogin(app, 'ca.editor');
    await grantCustomRole(editor, [
      'courses:view',
      'courses:edit',
      'courses:edit_any',
    ]);

    courseA = await createCourse(app, adminToken, {
      primaryInstructorId: p.profileId,
      coInstructorIds: [c.profileId],
    });
    courseB = await createCourse(app, adminToken);

    const { body: section } = await call(
      'post',
      `/admin/courses/${courseA}/sections`,
      adminToken,
      { title: 'S', displayOrder: 1 },
    ).expect(201);
    sectionA = section.id;
    const { body: lecture } = await call(
      'post',
      `/admin/courses/${courseA}/sections/${sectionA}/lectures`,
      adminToken,
      {
        title: 'L',
        lectureType: 'article',
        durationSecs: 60,
        isPreview: false,
        requiresCompletion: true,
        displayOrder: 1,
      },
    ).expect(201);
    lectureA = lecture.id;
  });

  afterAll(async () => {
    await db.end();
  });

  describe('the primary instructor (AC-21, AC-22)', () => {
    it('should edit their own course', () =>
      call('patch', `/admin/courses/${courseA}`, primary, {
        title: `Renamed ${Date.now()}`,
      }).expect(200));

    it('should not publish it', async () => {
      const { body } = await call(
        'post',
        `/admin/courses/${courseA}/publish`,
        primary,
      ).expect(403);

      expect(body.code).toBe('PERMISSION_DENIED');
    });

    it('should not create a course', () =>
      call('post', '/admin/courses', primary, {
        courseId: `CA-${Date.now()}`,
        title: 'x',
        language: 'en',
        price: 0,
        hasCertificate: false,
        enrollmentOpen: true,
      }).expect(403));

    it('should get a 404 editing a course they do not teach', () =>
      call('patch', `/admin/courses/${courseB}`, primary, {
        title: 'x',
      }).expect(404));

    it('should get a 404 reading a course they do not teach', () =>
      call('get', `/admin/courses/${courseB}`, primary).expect(404));

    it('should get a 404 listing the sections of a course they do not teach', () =>
      call('get', `/admin/courses/${courseB}/sections`, primary).expect(404));

    it('should add a section to their course', () =>
      call('post', `/admin/courses/${courseA}/sections`, primary, {
        title: 'Primary section',
        displayOrder: 5,
      }).expect(201));

    it('should edit lecture content in their course', () =>
      call('patch', `/admin/lectures/${lectureA}/content`, primary, {
        lectureType: 'article',
        body: '<p>hello</p>',
      }).expect(200));

    // Choosing who teaches a course is an admin decision.
    it('should not reassign the course’s instructors', async () => {
      const { body } = await call(
        'patch',
        `/admin/courses/${courseA}`,
        primary,
        {
          primaryInstructorId: outsiderProfile,
        },
      ).expect(403);

      expect(body.code).toBe('INSTRUCTOR_ASSIGNMENT_REQUIRES_ADMIN');
    });

    // Catalogue placement ("featured") is curated, not self-served.
    it('should not change the course’s catalogue groups', () =>
      call('put', `/admin/courses/${courseA}/groups`, primary, {
        groupIds: [],
      }).expect(403));

    it('should see myRole primary and canEdit', async () => {
      const { body } = await call(
        'get',
        `/admin/courses/${courseA}`,
        primary,
      ).expect(200);

      expect(body).toMatchObject({ myRole: 'primary', canEdit: true });
    });
  });

  describe('a co-instructor (R4)', () => {
    // AC-24
    it('should read the course with canEdit false', async () => {
      const { body } = await call(
        'get',
        `/admin/courses/${courseA}`,
        co,
      ).expect(200);

      expect(body).toMatchObject({ myRole: 'co_instructor', canEdit: false });
    });

    it('should list the sections', () =>
      call('get', `/admin/courses/${courseA}/sections`, co).expect(200));

    // AC-23
    it.each([
      [
        'the course',
        () => ['patch', `/admin/courses/${courseA}`, { title: 'x' }],
      ],
      [
        'a section',
        () => [
          'post',
          `/admin/courses/${courseA}/sections`,
          { title: 'x', displayOrder: 9 },
        ],
      ],
      [
        'a lecture',
        () => [
          'patch',
          `/admin/courses/${courseA}/sections/${sectionA}/lectures/${lectureA}`,
          { title: 'x' },
        ],
      ],
      [
        'lecture content',
        () => [
          'patch',
          `/admin/lectures/${lectureA}/content`,
          { lectureType: 'article', body: 'x' },
        ],
      ],
      [
        'the outcomes list',
        () => ['put', `/admin/courses/${courseA}/outcomes`, { items: [] }],
      ],
    ])(
      'should be refused editing %s with CO_INSTRUCTOR_READ_ONLY',
      async (_label, target) => {
        const [method, path, body] = target() as [
          'patch' | 'post' | 'put',
          string,
          object,
        ];

        const { body: error } = await call(method, path, co, body).expect(403);

        expect(error.code).toBe('CO_INSTRUCTOR_READ_ONLY');
      },
    );
  });

  describe('an instructor teaching nothing', () => {
    it('should get a 404 on someone else’s lecture content', () =>
      call('patch', `/admin/lectures/${lectureA}/content`, outsider, {
        lectureType: 'article',
        body: 'x',
      }).expect(404));

    it('should see an empty course list', async () => {
      const { body } = await call('get', '/admin/courses', outsider).expect(
        200,
      );

      expect(body.data).toEqual([]);
    });
  });

  describe('course list (§1.8)', () => {
    const idsOf = async (who: Account | string) => {
      const { body } = await call('get', '/admin/courses?limit=50', who).expect(
        200,
      );
      return body.data as { id: string; myRole: string; canEdit: boolean }[];
    };

    it('should show the primary only the courses they teach', async () => {
      const items = await idsOf(primary);

      expect(items.map((c) => c.id)).toEqual([courseA]);
      expect(items[0]).toMatchObject({ myRole: 'primary', canEdit: true });
    });

    it('should show a co-instructor their course, read-only', async () => {
      const items = await idsOf(co);

      expect(items).toEqual([
        expect.objectContaining({
          id: courseA,
          myRole: 'co_instructor',
          canEdit: false,
        }),
      ]);
    });

    it('should mark every course as admin for courses:edit_any', async () => {
      const items = await idsOf(adminToken);

      expect(items.length).toBeGreaterThan(0);
      expect(items.every((c) => c.myRole === 'admin' && c.canEdit)).toBe(true);
    });
  });

  // AC-13 — the bypass is a permission, not a role name.
  describe('a custom role holding courses:edit_any', () => {
    it('should edit a course nobody assigned it to', () =>
      call('patch', `/admin/courses/${courseB}`, editor, {
        title: `Edited by custom role ${Date.now()}`,
      }).expect(200));

    it('should reassign instructors', () =>
      call('patch', `/admin/courses/${courseB}`, editor, {
        primaryInstructorId: outsiderProfile,
      }).expect(200));
  });

  // Student data and certificates are course data too.
  describe('learner records on a course the caller does not teach', () => {
    let enrollmentId: string;

    beforeAll(async () => {
      const learner = await registerAndLogin(app, 'ca.learner');
      const { rows } = await db.query(
        `INSERT INTO "enrollment" ("student_id", "course_id", "enrollment_date",
                                   "status", "progress_pct")
         VALUES ($1, $2, now(), 'in_progress', 50)
         RETURNING "id"`,
        [learner.userId, courseB],
      );
      enrollmentId = rows[0].id;
    });

    it('should not reset the learner’s progress', () =>
      call(
        'delete',
        `/admin/enrollments/${enrollmentId}/progress`,
        primary,
      ).expect(404));

    it('should not regenerate the learner’s certificate', () =>
      call(
        'post',
        `/enrollments/${enrollmentId}/certificate/regenerate`,
        primary,
      ).expect(404));
  });

  describe('career reflection questions', () => {
    let courseQuestion: string;
    let otherCourseQuestion: string;
    let globalQuestion: string;

    const question = (course: string | null, isActive: boolean) =>
      call('post', '/admin/career-reflection-questions', adminToken, {
        questionType: 'free_text',
        questionText: `CA question ${Date.now()}`,
        isActive,
        displayOrder: 99,
        course: course ? { id: course } : null,
      }).expect(201);

    beforeAll(async () => {
      courseQuestion = (await question(courseA, true)).body.id;
      otherCourseQuestion = (await question(courseB, true)).body.id;
      // Inactive: an active global question is required on every form, and
      // would break the learning suites running alongside this one.
      globalQuestion = (await question(null, false)).body.id;
    });

    it('should let the primary edit a question on their course', () =>
      call(
        'patch',
        `/admin/career-reflection-questions/${courseQuestion}`,
        primary,
        { questionText: 'Edited by primary' },
      ).expect(200));

    it('should refuse the co-instructor', async () => {
      const { body } = await call(
        'patch',
        `/admin/career-reflection-questions/${courseQuestion}`,
        co,
        { questionText: 'x' },
      ).expect(403);

      expect(body.code).toBe('CO_INSTRUCTOR_READ_ONLY');
    });

    it('should 404 a question on a course the caller does not teach', () =>
      call(
        'patch',
        `/admin/career-reflection-questions/${otherCourseQuestion}/deactivate`,
        primary,
      ).expect(404));

    // A global question appears on every course.
    it('should refuse a global question without courses:edit_any', async () => {
      const { body } = await call(
        'patch',
        `/admin/career-reflection-questions/${globalQuestion}`,
        primary,
        { questionText: 'x' },
      ).expect(403);

      expect(body.required).toEqual({ module: 'courses', action: 'edit_any' });
    });

    // Moving a question onto another course, or making it global, is a
    // write to that other course too.
    it('should refuse moving a question to a course the caller does not teach', () =>
      call(
        'patch',
        `/admin/career-reflection-questions/${courseQuestion}`,
        primary,
        { course: { id: courseB } },
      ).expect(404));

    it('should list only global questions and the caller’s courses', async () => {
      const { body } = await call(
        'get',
        '/admin/career-reflection-questions',
        primary,
      ).expect(200);

      const ids = body.map((q: { id: string }) => q.id);
      expect(ids).toContain(courseQuestion);
      expect(ids).toContain(globalQuestion);
      expect(ids).not.toContain(otherCourseQuestion);
    });

    it('should 404 a list filtered to a course the caller does not teach', () =>
      call(
        'get',
        `/admin/career-reflection-questions?courseId=${courseB}`,
        primary,
      ).expect(404));
  });
});
