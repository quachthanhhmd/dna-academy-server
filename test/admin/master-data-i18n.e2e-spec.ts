import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin, makeSuperAdmin } from '../utils/admin';

describe('Epic 6 — bilingual master data', () => {
  const app = APP_URL;
  const runId = Date.now();

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'I18n', lastName: 'Tester' })
      .expect(204);

    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password })
      .expect(200);

    return { token: body.token as string, userId: body.user.id as number };
  };

  let seededAdminToken: string;

  let adminToken: string;
  let studentToken: string;
  let codeId: string;

  beforeAll(async () => {
    seededAdminToken = await loginSeededSuperAdmin(app);
    const admin = await registerAndLogin(`i18n.admin.${runId}@example.com`);
    adminToken = admin.token;
    await makeSuperAdmin(app, seededAdminToken, admin.userId);

    const student = await registerAndLogin(`i18n.student.${runId}@example.com`);
    studentToken = student.token;

    const { body } = await request(app)
      .post('/api/v1/admin/master-data/groups/course_level/codes')
      .auth(adminToken, { type: 'bearer' })
      .send({
        code: `e2e_level_${runId}`,
        nameTranslations: {
          vi: `Cấp độ ${runId}`,
          en: `Level ${runId}`,
        },
        descriptionTranslations: { vi: 'Mô tả', en: 'Description' },
        displayOrder: 90,
      })
      .expect(201);
    codeId = body.id;
    // Registration hashes a password and sends a confirmation mail, which is
    // slower than Jest's 5s default hook timeout on a cold server.
  }, 60000);

  describe('GET /i18n/locales', () => {
    it('should list the supported locales without auth', async () => {
      await request(app)
        .get('/api/v1/i18n/locales')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual([
            { code: 'vi', name: 'Tiếng Việt', isDefault: true },
            { code: 'en', name: 'English', isDefault: false },
          ]);
        });
    });
  });

  describe('locale resolution chain', () => {
    const nameOf = (body: Record<string, unknown>[]) =>
      body.find((item) => item.id === codeId)?.name;

    it('should default to Vietnamese', async () => {
      await request(app)
        .get('/api/v1/master-data/codes?groupKey=course_level')
        .expect(200)
        .expect(({ body }) => {
          expect(nameOf(body)).toBe(`Cấp độ ${runId}`);
        });
    });

    it('should honour ?locale=', async () => {
      await request(app)
        .get('/api/v1/master-data/codes?groupKey=course_level&locale=en')
        .expect(200)
        .expect(({ body }) => expect(nameOf(body)).toBe(`Level ${runId}`));
    });

    it('should honour the X-Locale header', async () => {
      await request(app)
        .get('/api/v1/master-data/codes?groupKey=course_level')
        .set('X-Locale', 'en')
        .expect(200)
        .expect(({ body }) => expect(nameOf(body)).toBe(`Level ${runId}`));
    });

    it('should honour Accept-Language', async () => {
      await request(app)
        .get('/api/v1/master-data/codes?groupKey=course_level')
        .set('Accept-Language', 'en-US,en;q=0.9,vi;q=0.5')
        .expect(200)
        .expect(({ body }) => expect(nameOf(body)).toBe(`Level ${runId}`));
    });

    it('should let ?locale= outrank X-Locale', async () => {
      await request(app)
        .get('/api/v1/master-data/codes?groupKey=course_level&locale=vi')
        .set('X-Locale', 'en')
        .expect(200)
        .expect(({ body }) => expect(nameOf(body)).toBe(`Cấp độ ${runId}`));
    });

    it('should fall back to Vietnamese for an unsupported locale', async () => {
      await request(app)
        .get('/api/v1/master-data/codes?groupKey=course_level&locale=fr')
        .expect(200)
        .expect(({ body }) => expect(nameOf(body)).toBe(`Cấp độ ${runId}`));
    });

    it('should echo the resolved locale and vary on the locale inputs', async () => {
      await request(app)
        .get('/api/v1/master-data/codes?groupKey=course_level&locale=en')
        .expect(200)
        .expect('Content-Language', 'en')
        .expect(({ headers }) => {
          expect(headers.vary).toContain('X-Locale');
          expect(headers.vary).toContain('Accept-Language');
          // The public endpoints take an optional bearer token, so the body
          // also depends on the caller's stored users.locale.
          expect(headers.vary).toContain('Authorization');
        });
    });
  });

  describe('PATCH /auth/me/locale', () => {
    it('should default a new user to Vietnamese', async () => {
      await request(app)
        .get('/api/v1/auth/profile/me')
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => expect(body.user.locale).toBe('vi'));
    });

    it('should persist the preference and apply it to later requests', async () => {
      await request(app)
        .patch('/api/v1/auth/me/locale')
        .auth(studentToken, { type: 'bearer' })
        .send({ locale: 'en' })
        .expect(200)
        .expect(({ body }) => expect(body.user.locale).toBe('en'));

      await request(app)
        .get('/api/v1/master-data/codes?groupKey=course_level')
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect('Content-Language', 'en');
    });

    it('should still let an explicit locale outrank the stored preference', async () => {
      await request(app)
        .get('/api/v1/master-data/codes?groupKey=course_level&locale=vi')
        .auth(studentToken, { type: 'bearer' })
        .expect(200)
        .expect('Content-Language', 'vi');
    });

    it('should reject an unsupported locale', async () => {
      await request(app)
        .patch('/api/v1/auth/me/locale')
        .auth(studentToken, { type: 'bearer' })
        .send({ locale: 'fr' })
        .expect(422);
    });
  });

  describe('admin write path', () => {
    it('should return the full translation maps', async () => {
      await request(app)
        .get('/api/v1/admin/master-data/groups/course_level/codes')
        .auth(adminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          const row = body.find((item) => item.id === codeId);
          expect(row.nameTranslations).toEqual({
            vi: `Cấp độ ${runId}`,
            en: `Level ${runId}`,
          });
        });
    });

    it('should merge a single-locale patch without dropping the other', async () => {
      await request(app)
        .patch(`/api/v1/admin/master-data/groups/course_level/codes/${codeId}`)
        .auth(adminToken, { type: 'bearer' })
        .send({ nameTranslations: { en: `Renamed ${runId}` } })
        .expect(200)
        .expect(({ body }) => {
          expect(body.nameTranslations).toEqual({
            vi: `Cấp độ ${runId}`,
            en: `Renamed ${runId}`,
          });
        });
    });

    it('should not let a PATCH under ?locale=en overwrite the Vietnamese base', async () => {
      await request(app)
        .patch(
          `/api/v1/admin/master-data/groups/course_level/codes/${codeId}?locale=en`,
        )
        .auth(adminToken, { type: 'bearer' })
        .send({ displayOrder: 91 })
        .expect(200);

      await request(app)
        .get('/api/v1/admin/master-data/groups/course_level/codes?locale=vi')
        .auth(adminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          const row = body.find((item) => item.id === codeId);
          expect(row.nameTranslations.vi).toBe(`Cấp độ ${runId}`);
          expect(row.name).toBe(`Cấp độ ${runId}`);
        });
    });

    it('should accept a legacy name-only payload as the default locale', async () => {
      await request(app)
        .post('/api/v1/admin/master-data/groups/course_level/codes')
        .auth(adminToken, { type: 'bearer' })
        .send({ code: `e2e_legacy_${runId}`, name: `Kiểu cũ ${runId}` })
        .expect(201)
        .expect(({ body }) => {
          expect(body.nameTranslations).toEqual({ vi: `Kiểu cũ ${runId}` });
        });
    });

    it('should 422 when no Vietnamese name can be derived', async () => {
      await request(app)
        .post('/api/v1/admin/master-data/groups/course_level/codes')
        .auth(adminToken, { type: 'bearer' })
        .send({
          code: `e2e_bad_${runId}`,
          nameTranslations: { en: 'English only' },
        })
        .expect(422);
    });

    it('should 422 on an unsupported locale key', async () => {
      await request(app)
        .post('/api/v1/admin/master-data/groups/course_level/codes')
        .auth(adminToken, { type: 'bearer' })
        .send({
          code: `e2e_bad2_${runId}`,
          nameTranslations: { vi: 'Hợp lệ', fr: 'Invalide' },
        })
        .expect(422);
    });
  });

  describe('translation coverage', () => {
    it('should report a gap for a Vietnamese-only code', async () => {
      const { body: created } = await request(app)
        .post('/api/v1/admin/master-data/groups/course_level/codes')
        .auth(adminToken, { type: 'bearer' })
        .send({
          code: `e2e_vionly_${runId}`,
          nameTranslations: { vi: `Chỉ tiếng Việt ${runId}` },
        })
        .expect(201);

      await request(app)
        .get(
          '/api/v1/admin/master-data/groups/course_level/translation-coverage',
        )
        .auth(adminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.vi.missingIds).toEqual([]);
          expect(body.en.missingIds).toContain(created.id);
          expect(body.en.translated).toBeLessThan(body.en.total);
        });
    });

    it('should require the master_data permission', async () => {
      await request(app)
        .get(
          '/api/v1/admin/master-data/groups/course_level/translation-coverage',
        )
        .auth(studentToken, { type: 'bearer' })
        .expect(403);
    });
  });

  describe('localized reads elsewhere', () => {
    it('should localize a nested master data relation on the admin course detail', async () => {
      // Proves the nested eager path Course -> MasterDataCode goes through the
      // mapper, using a seeded code that is guaranteed to be bilingual.
      const { body: levels } = await request(app)
        .get('/api/v1/master-data/codes?groupKey=course_level&locale=en')
        .expect(200);
      const beginner = levels.find((item) => item.code === 'beginner');
      expect(beginner.name).toBe('Beginner');

      const { body: course } = await request(app)
        .post('/api/v1/admin/courses')
        .auth(adminToken, { type: 'bearer' })
        .send({
          courseId: `I18N-${runId}`,
          title: `I18n course ${runId}`,
          language: 'vi',
          price: 0,
          hasCertificate: false,
          enrollmentOpen: true,
          levelId: beginner.id,
        })
        .expect(201);

      await request(app)
        .get(`/api/v1/admin/courses/${course.id}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => expect(body.level.name).toBe('Cơ bản'));

      await request(app)
        .get(`/api/v1/admin/courses/${course.id}?locale=en`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => expect(body.level.name).toBe('Beginner'));
    });

    it('should localize the public catalog level when the course has one', async () => {
      const { body } = await request(app)
        .get('/api/v1/courses?locale=en')
        .expect(200)
        .expect('Content-Language', 'en');

      for (const card of body.data) {
        if (card.level) {
          expect(typeof card.level.name).toBe('string');
        }
      }
    });
  });
});
