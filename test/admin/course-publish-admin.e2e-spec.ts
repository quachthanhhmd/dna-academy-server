import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin, makeSuperAdmin } from '../utils/admin';

describe('Admin / Course Publish', () => {
  const app = APP_URL;
  const runId = Date.now();

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'Publish', lastName: 'Tester' })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password })
      .expect(200);

    return { token: body.token as string, userId: body.user.id as number };
  };

  let seededAdminToken: string;

  let superAdminToken: string;
  let levelId: string;
  let categoryId: string;
  let instructorId: string;

  beforeAll(async () => {
    seededAdminToken = await loginSeededSuperAdmin(app);
    const superAdmin = await registerAndLogin(
      `course-publish.super.${runId}@example.com`,
    );
    superAdminToken = superAdmin.token;
    await makeSuperAdmin(app, seededAdminToken, superAdmin.userId);

    const { body: level } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_level/codes')
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        code: `level_${runId}`,
        // Unique per run: master data names are unique within a group, so a
        // constant here makes the suite fail on its second run.
        name: `Level ${runId}`,
        displayOrder: 1,
        isActive: true,
      })
      .expect(201);
    levelId = level.id;

    const { body: category } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_category/codes')
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        code: `category_${runId}`,
        name: `Category ${runId}`,
        displayOrder: 1,
        isActive: true,
      })
      .expect(201);
    categoryId = category.id;

    const { body: instructor } = await request(app)
      .post('/api/v1/admin/instructors')
      .auth(superAdminToken, { type: 'bearer' })
      .send({ fullName: `Publish Instructor ${runId}` })
      .expect(201);
    instructorId = instructor.id;
  });

  let courseCodeSeq = 0;

  const createCourse = async (title: string) => {
    courseCodeSeq += 1;

    const { body: course } = await request(app)
      .post('/api/v1/admin/courses')
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        courseId: `PUB-${runId}-${courseCodeSeq}`,
        title,
        language: 'en',
        price: 0,
        hasCertificate: false,
        enrollmentOpen: true,
      })
      .expect(201);

    return course.id as string;
  };

  it('should reject publish with missingItems when the checklist is incomplete', async () => {
    const courseId = await createCourse(`Incomplete ${runId}`);

    await request(app)
      .post(`/api/v1/admin/courses/${courseId}/publish`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(422)
      .expect(({ body }) => {
        expect(body.missingItems).toEqual(
          expect.arrayContaining([
            'shortDescription',
            'thumbnailUrl',
            'levelId',
            'categoryId',
            'primaryInstructor',
            'curriculum',
          ]),
        );
      });
  });

  it('should publish a fully-prepared course and record publishedAt/publishedBy', async () => {
    const courseId = await createCourse(`Complete ${runId}`);

    await request(app)
      .patch(`/api/v1/admin/courses/${courseId}`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        shortDescription: 'Short',
        thumbnailUrl: 'https://example.com/thumb.png',
        levelId,
        categoryId,
        primaryInstructorId: instructorId,
      })
      .expect(200);

    const { body: section } = await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ title: 'Section', displayOrder: 1 })
      .expect(201);

    const { body: lecture } = await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections/${section.id}/lectures`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        title: 'Lecture',
        lectureType: 'article',
        durationSecs: 60,
        isPreview: false,
        requiresCompletion: true,
        displayOrder: 1,
      })
      .expect(201);

    await request(app)
      .post(`/api/v1/admin/courses/${courseId}/publish`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(422)
      .expect(({ body }) => {
        expect(body.missingItems).toEqual(['lectureContent']);
      });

    await request(app)
      .patch(`/api/v1/admin/lectures/${lecture.id}/content`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ lectureType: 'article', body: '<p>Hi</p>' })
      .expect(200);

    await request(app)
      .post(`/api/v1/admin/courses/${courseId}/publish`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('published');
        expect(body.publishedAt).toBeTruthy();
        expect(body.publishedBy).toBeTruthy();
      });
  });

  it('should unpublish a course, changing only status', async () => {
    const courseId = await createCourse(`Unpublish ${runId}`);

    await request(app)
      .patch(`/api/v1/admin/courses/${courseId}`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        shortDescription: 'Short',
        thumbnailUrl: 'https://example.com/thumb.png',
        levelId,
        categoryId,
        primaryInstructorId: instructorId,
      })
      .expect(200);

    const { body: section } = await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ title: 'Section', displayOrder: 1 })
      .expect(201);

    const { body: lecture } = await request(app)
      .post(`/api/v1/admin/courses/${courseId}/sections/${section.id}/lectures`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        title: 'Lecture',
        lectureType: 'article',
        durationSecs: 60,
        isPreview: false,
        requiresCompletion: true,
        displayOrder: 1,
      })
      .expect(201);

    await request(app)
      .patch(`/api/v1/admin/lectures/${lecture.id}/content`)
      .auth(superAdminToken, { type: 'bearer' })
      .send({ lectureType: 'article', body: '<p>Hi</p>' })
      .expect(200);

    await request(app)
      .post(`/api/v1/admin/courses/${courseId}/publish`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200);

    await request(app)
      .post(`/api/v1/admin/courses/${courseId}/unpublish`)
      .auth(superAdminToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('unpublished');
        expect(body.publishedAt).toBeTruthy();
      });
  });

  it('should return 404 when publishing a non-existent course', async () => {
    await request(app)
      .post(
        '/api/v1/admin/courses/00000000-0000-0000-0000-000000000000/publish',
      )
      .auth(superAdminToken, { type: 'bearer' })
      .expect(404);
  });
});
