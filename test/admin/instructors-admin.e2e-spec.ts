import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin, makeSuperAdmin } from '../utils/admin';

describe('Admin / Instructors', () => {
  const app = APP_URL;
  const runId = Date.now();

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'Instructor', lastName: 'Tester' })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password })
      .expect(200);

    return { token: body.token as string, userId: body.user.id as number };
  };

  const createInstructor = async (payload: Record<string, unknown>) => {
    const { body } = await request(app)
      .post('/api/v1/admin/instructors')
      .auth(superAdminToken, { type: 'bearer' })
      .send(payload)
      .expect(201);

    return body;
  };

  let courseCodeSeq = 0;
  const createCourse = async (
    title: string,
    extra: Record<string, unknown> = {},
  ) => {
    courseCodeSeq += 1;

    const { body } = await request(app)
      .post('/api/v1/admin/courses')
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        courseId: `INS-${runId}-${courseCodeSeq}`,
        title,
        language: 'en',
        price: 0,
        hasCertificate: false,
        enrollmentOpen: true,
        ...extra,
      })
      .expect(201);

    return body.id as string;
  };

  let seededAdminToken: string;

  let superAdminToken: string;
  let plainUserToken: string;
  let linkableUserId: number;
  let expertiseCodeId: string;

  beforeAll(async () => {
    seededAdminToken = await loginSeededSuperAdmin(app);
    const superAdmin = await registerAndLogin(
      `instructors-admin.super.${runId}@example.com`,
    );
    superAdminToken = superAdmin.token;
    await makeSuperAdmin(app, seededAdminToken, superAdmin.userId);

    const plain = await registerAndLogin(
      `instructors-admin.plain.${runId}@example.com`,
    );
    plainUserToken = plain.token;

    const linkable = await registerAndLogin(
      `instructors-admin.linkable.${runId}@example.com`,
    );
    linkableUserId = linkable.userId;

    const { body: code } = await request(app)
      .post('/api/v1/admin/master-data/groups/expertise_area/codes')
      .auth(superAdminToken, { type: 'bearer' })
      .send({
        code: `data_analytics_${runId}`,
        name: `Data Analytics ${runId}`,
        displayOrder: 1,
        isActive: true,
      })
      .expect(201);
    expertiseCodeId = code.id;
  });

  describe('permissions', () => {
    it('should reject a user with no granted permissions on every verb', async () => {
      await request(app)
        .get('/api/v1/admin/instructors')
        .auth(plainUserToken, { type: 'bearer' })
        .expect(403);

      await request(app)
        .post('/api/v1/admin/instructors')
        .auth(plainUserToken, { type: 'bearer' })
        .send({ fullName: 'Nope' })
        .expect(403);
    });

    it('should reject an anonymous caller', async () => {
      await request(app).get('/api/v1/admin/instructors').expect(401);
    });
  });

  describe('create', () => {
    it('should ASCII-fold a Vietnamese name into the generated slug', async () => {
      const instructor = await createInstructor({
        fullName: `Nguyễn Văn A ${runId}`,
      });

      expect(instructor.slug).toBe(`nguyen-van-a-${runId}`);
      expect(instructor.isActive).toBe(true);
      expect(instructor.stats).toEqual({
        totalCourses: 0,
        totalStudents: 0,
        avgRating: null,
      });
    });

    it('should suffix the slug when the derived one is taken', async () => {
      const name = `Collision Case ${runId}`;
      const first = await createInstructor({ fullName: name });
      const second = await createInstructor({ fullName: name });

      expect(second.slug).toBe(`${first.slug}-2`);
    });

    it('should persist expertise and social links', async () => {
      const instructor = await createInstructor({
        fullName: `Full Profile ${runId}`,
        headline: 'Senior Data Analyst',
        bio: '<p>Bio</p>',
        emailPublic: `public.${runId}@example.com`,
        yearsOfExperience: 7,
        expertiseCodeIds: [expertiseCodeId],
        socialLinks: [
          { platform: 'linkedin', url: 'https://www.linkedin.com/in/a' },
        ],
      });

      expect(instructor.expertise).toEqual([
        expect.objectContaining({ id: expertiseCodeId }),
      ]);
      expect(instructor.socialLinks).toEqual([
        expect.objectContaining({
          platform: 'linkedin',
          url: 'https://www.linkedin.com/in/a',
        }),
      ]);
    });

    it('should reject an expertise code from another master data group', async () => {
      const { body: levelCode } = await request(app)
        .post('/api/v1/admin/master-data/groups/course_level/codes')
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          code: `wrong_group_${runId}`,
          name: `Wrong Group ${runId}`,
          displayOrder: 1,
          isActive: true,
        })
        .expect(201);

      await request(app)
        .post('/api/v1/admin/instructors')
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          fullName: `Bad Expertise ${runId}`,
          expertiseCodeIds: [levelCode.id],
        })
        .expect(422);
    });

    it('should reject an invalid emailPublic', async () => {
      await request(app)
        .post('/api/v1/admin/instructors')
        .auth(superAdminToken, { type: 'bearer' })
        .send({ fullName: `Bad Email ${runId}`, emailPublic: 'not-an-email' })
        .expect(422);
    });
  });

  describe('list', () => {
    it('should filter by search term and by status', async () => {
      const unique = `Searchable${runId}`;
      const instructor = await createInstructor({ fullName: unique });

      const { body: found } = await request(app)
        .get(`/api/v1/admin/instructors?q=${unique}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);

      expect(found.data.map((row) => row.id)).toEqual([instructor.id]);
      expect(found.totalCount).toBe(1);

      await request(app)
        .patch(`/api/v1/admin/instructors/${instructor.id}/status`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ isActive: false })
        .expect(200);

      const { body: activeOnly } = await request(app)
        .get(`/api/v1/admin/instructors?q=${unique}&status=active`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);
      expect(activeOnly.data).toEqual([]);

      const { body: inactiveOnly } = await request(app)
        .get(`/api/v1/admin/instructors?q=${unique}&status=inactive`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);
      expect(inactiveOnly.data).toHaveLength(1);
    });

    it('should filter by expertise', async () => {
      const instructor = await createInstructor({
        fullName: `Expert Filter ${runId}`,
        expertiseCodeIds: [expertiseCodeId],
      });

      const { body } = await request(app)
        .get(`/api/v1/admin/instructors?expertiseId=${expertiseCodeId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);

      expect(body.data.map((row) => row.id)).toContain(instructor.id);
    });

    it('should reject an unknown sort column', async () => {
      await request(app)
        .get('/api/v1/admin/instructors?sortBy=password')
        .auth(superAdminToken, { type: 'bearer' })
        .expect(422);
    });
  });

  describe('update', () => {
    it('should replace the expertise set and clear it with an empty array', async () => {
      const instructor = await createInstructor({
        fullName: `Replace Expertise ${runId}`,
        expertiseCodeIds: [expertiseCodeId],
      });

      const { body: cleared } = await request(app)
        .put(`/api/v1/admin/instructors/${instructor.id}`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ expertiseCodeIds: [] })
        .expect(200);

      expect(cleared.expertise).toEqual([]);
    });

    it('should leave expertise untouched when the key is omitted', async () => {
      const instructor = await createInstructor({
        fullName: `Keep Expertise ${runId}`,
        expertiseCodeIds: [expertiseCodeId],
      });

      const { body: updated } = await request(app)
        .put(`/api/v1/admin/instructors/${instructor.id}`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ headline: 'Only the headline changed' })
        .expect(200);

      expect(updated.expertise).toHaveLength(1);
      expect(updated.headline).toBe('Only the headline changed');
    });

    it('should 404 for an unknown instructor', async () => {
      await request(app)
        .get('/api/v1/admin/instructors/00000000-0000-4000-8000-000000000000')
        .auth(superAdminToken, { type: 'bearer' })
        .expect(404);
    });
  });

  describe('link-user', () => {
    it('should link a free account and reject a second claim on it', async () => {
      const first = await createInstructor({ fullName: `Linker A ${runId}` });
      const second = await createInstructor({ fullName: `Linker B ${runId}` });

      const { body: linked } = await request(app)
        .patch(`/api/v1/admin/instructors/${first.id}/link-user`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ userId: linkableUserId })
        .expect(200);
      expect(linked.userId).toBe(linkableUserId);

      await request(app)
        .patch(`/api/v1/admin/instructors/${second.id}/link-user`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ userId: linkableUserId })
        .expect(409)
        .expect(({ body }) => {
          expect(body.error).toBe('user_already_linked');
        });

      const { body: unlinked } = await request(app)
        .patch(`/api/v1/admin/instructors/${first.id}/link-user`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ userId: null })
        .expect(200);
      expect(unlinked.userId).toBeNull();
    });
  });

  describe('course assignment', () => {
    it('should assign a primary and co-instructors and expose them on the course detail', async () => {
      const primary = await createInstructor({ fullName: `Primary ${runId}` });
      const co = await createInstructor({ fullName: `Co ${runId}` });

      const courseId = await createCourse(`Assigned ${runId}`, {
        primaryInstructorId: primary.id,
        coInstructorIds: [co.id],
      });

      await request(app)
        .get(`/api/v1/admin/courses/${courseId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.primaryInstructor.id).toBe(primary.id);
          expect(body.coInstructors.map((item) => item.id)).toEqual([co.id]);
        });
    });

    it('should reject a co-instructor list that repeats the primary', async () => {
      const primary = await createInstructor({ fullName: `Dup ${runId}` });

      await request(app)
        .post('/api/v1/admin/courses')
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          courseId: `INS-DUP-${runId}`,
          title: `Dup course ${runId}`,
          language: 'en',
          price: 0,
          hasCertificate: false,
          enrollmentOpen: true,
          primaryInstructorId: primary.id,
          coInstructorIds: [primary.id],
        })
        .expect(422);
    });

    it('should refuse to assign a deactivated instructor to a new course', async () => {
      const instructor = await createInstructor({
        fullName: `Deactivated ${runId}`,
      });
      await request(app)
        .patch(`/api/v1/admin/instructors/${instructor.id}/status`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ isActive: false })
        .expect(200);

      await request(app)
        .post('/api/v1/admin/courses')
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          courseId: `INS-INACTIVE-${runId}`,
          title: `Inactive course ${runId}`,
          language: 'en',
          price: 0,
          hasCertificate: false,
          enrollmentOpen: true,
          primaryInstructorId: instructor.id,
        })
        .expect(422);
    });

    it('should swap the primary without tripping the one-primary index', async () => {
      const first = await createInstructor({ fullName: `Swap A ${runId}` });
      const second = await createInstructor({ fullName: `Swap B ${runId}` });

      const courseId = await createCourse(`Swap ${runId}`, {
        primaryInstructorId: first.id,
        coInstructorIds: [second.id],
      });

      await request(app)
        .patch(`/api/v1/admin/courses/${courseId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          primaryInstructorId: second.id,
          coInstructorIds: [first.id],
        })
        .expect(200);

      await request(app)
        .get(`/api/v1/admin/courses/${courseId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.primaryInstructor.id).toBe(second.id);
          expect(body.coInstructors.map((item) => item.id)).toEqual([first.id]);
        });
    });

    it('should list the assigned courses on the instructor and count them in stats', async () => {
      const instructor = await createInstructor({
        fullName: `Counted ${runId}`,
      });
      const courseId = await createCourse(`Counted course ${runId}`, {
        primaryInstructorId: instructor.id,
      });

      await request(app)
        .get(`/api/v1/admin/instructors/${instructor.id}/courses`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual([
            expect.objectContaining({ id: courseId, role: 'primary' }),
          ]);
        });

      await request(app)
        .get(`/api/v1/admin/instructors/${instructor.id}/stats`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.totalCourses).toBe(1);
          expect(body.publishedCourses).toBe(0);
          expect(body.totalStudents).toBe(0);
          expect(body.avgRating).toBeNull();
        });
    });

    it('should filter the admin course list by instructor', async () => {
      const instructor = await createInstructor({
        fullName: `Course Filter ${runId}`,
      });
      const courseId = await createCourse(`Filtered ${runId}`, {
        primaryInstructorId: instructor.id,
      });

      await request(app)
        .get(`/api/v1/admin/courses?instructorId=${instructor.id}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.data.map((item) => item.id)).toEqual([courseId]);
        });
    });
  });

  describe('student-facing surfaces', () => {
    let publishedSlug: string;
    let primaryId: string;
    let coId: string;

    beforeAll(async () => {
      const { body: level } = await request(app)
        .post('/api/v1/admin/master-data/groups/course_level/codes')
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          code: `stu_level_${runId}`,
          name: `Level ${runId}`,
          displayOrder: 1,
          isActive: true,
        })
        .expect(201);

      const { body: category } = await request(app)
        .post('/api/v1/admin/master-data/groups/course_category/codes')
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          code: `stu_category_${runId}`,
          name: `Category ${runId}`,
          displayOrder: 1,
          isActive: true,
        })
        .expect(201);

      const primary = await createInstructor({
        fullName: `Public Primary ${runId}`,
        headline: 'Teaches things',
        bio: '<p>Public bio</p>',
        expertiseCodeIds: [expertiseCodeId],
        socialLinks: [
          { platform: 'linkedin', url: 'https://www.linkedin.com/in/pub' },
        ],
      });
      const co = await createInstructor({ fullName: `Public Co ${runId}` });
      primaryId = primary.id;
      coId = co.id;

      const courseId = await createCourse(`Published ${runId}`, {
        primaryInstructorId: primary.id,
        coInstructorIds: [co.id],
      });

      await request(app)
        .patch(`/api/v1/admin/courses/${courseId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          shortDescription: 'Short',
          thumbnailUrl: 'https://example.com/thumb.png',
          levelId: level.id,
          categoryId: category.id,
        })
        .expect(200);

      const { body: section } = await request(app)
        .post(`/api/v1/admin/courses/${courseId}/sections`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ title: 'Section', displayOrder: 1 })
        .expect(201);

      const { body: lecture } = await request(app)
        .post(
          `/api/v1/admin/courses/${courseId}/sections/${section.id}/lectures`,
        )
        .auth(superAdminToken, { type: 'bearer' })
        .send({
          title: 'Lecture',
          lectureType: 'article',
          displayOrder: 1,
          durationSecs: 60,
          isPreview: false,
          requiresCompletion: false,
        })
        .expect(201);

      await request(app)
        .patch(`/api/v1/admin/lectures/${lecture.id}/content`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ lectureType: 'article', body: '<p>Body</p>' })
        .expect(200);

      await request(app)
        .post(`/api/v1/admin/courses/${courseId}/publish`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);

      const { body: detail } = await request(app)
        .get(`/api/v1/admin/courses/${courseId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);
      publishedSlug = detail.slug;
    });

    it('should list the instructor on the public endpoint without auth', async () => {
      await request(app)
        .get(`/api/v1/instructors?q=Public Primary ${runId}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.map((row) => row.id)).toEqual([primaryId]);
          expect(body[0]).toEqual(
            expect.objectContaining({ slug: expect.any(String) }),
          );
        });
    });

    it('should exclude an instructor with no published course from the public list', async () => {
      const unpublishedOnly = await createInstructor({
        fullName: `No Published ${runId}`,
      });
      await createCourse(`Draft only ${runId}`, {
        primaryInstructorId: unpublishedOnly.id,
      });

      await request(app)
        .get(`/api/v1/instructors?q=No Published ${runId}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual([]);
        });
    });

    it('should show the primary instructor on the catalog card', async () => {
      await request(app)
        .get(`/api/v1/courses?instructorId=${primaryId}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.data).toHaveLength(1);
          expect(body.data[0].primaryInstructor.id).toBe(primaryId);
          expect(body.data[0].coInstructorCount).toBe(1);
        });
    });

    it('should return the full instructor profiles on the course overview', async () => {
      await request(app)
        .get(`/api/v1/courses/${publishedSlug}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body.primaryInstructor).toEqual(
            expect.objectContaining({
              id: primaryId,
              bio: '<p>Public bio</p>',
              headline: 'Teaches things',
            }),
          );
          expect(body.primaryInstructor.expertise).toHaveLength(1);
          expect(body.primaryInstructor.socialLinks).toHaveLength(1);
          expect(body.coInstructors.map((item) => item.id)).toEqual([coId]);
        });
    });

    it('should report the published course in the instructor stats', async () => {
      await request(app)
        .get(`/api/v1/admin/instructors/${primaryId}/stats`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.totalCourses).toBe(1);
          expect(body.publishedCourses).toBe(1);
        });
    });

    it('should lock the slug once a published course uses the instructor', async () => {
      await request(app)
        .put(`/api/v1/admin/instructors/${primaryId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .send({ slug: `renamed-${runId}` })
        .expect(409)
        .expect(({ body }) => {
          expect(body.error).toBe('slug_locked');
        });
    });
  });

  describe('delete', () => {
    it('should delete an unassigned instructor', async () => {
      const instructor = await createInstructor({
        fullName: `Deletable ${runId}`,
      });

      await request(app)
        .delete(`/api/v1/admin/instructors/${instructor.id}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(204);

      await request(app)
        .get(`/api/v1/admin/instructors/${instructor.id}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(404);
    });

    it('should 409 with the assignment count when courses reference the instructor', async () => {
      const instructor = await createInstructor({
        fullName: `Undeletable ${runId}`,
      });
      await createCourse(`Blocking ${runId}`, {
        primaryInstructorId: instructor.id,
      });

      await request(app)
        .delete(`/api/v1/admin/instructors/${instructor.id}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(409)
        .expect(({ body }) => {
          expect(body.error).toBe('has_assigned_courses');
          expect(body.assignedCoursesCount).toBe(1);
        });
    });
  });
});
