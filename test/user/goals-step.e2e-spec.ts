import { beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';

type MasterCode = {
  id: string;
  code: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
};

describe('GoalsStep onboarding contract', () => {
  const app = APP_URL;
  const runId = Date.now();
  let token: string;
  let educationStageId: string;
  let careerInterests: MasterCode[];

  const getCodes = async (groupKey: string, locale = 'vi') => {
    const { body } = await request(app)
      .get('/api/v1/master-data/codes')
      .query({ groupKey })
      .set('X-Locale', locale)
      .expect(200);

    return body as MasterCode[];
  };

  const register = async (label: string) => {
    const email = `goals.${label}.${runId}@example.com`;
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password: 'secret', firstName: 'Goals', lastName: 'Test' })
      .expect(204);
    const { body } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password: 'secret' })
      .expect(200);
    return body.token as string;
  };

  const validPayload = () => ({
    age: 25,
    educationStageCodeId: educationStageId,
    careerInterestIds: [careerInterests[0].id],
    currentStatusCode: 'core_skills',
    customStatus: null,
    customInterest: null,
  });

  beforeAll(async () => {
    token = await register('main');
    educationStageId = (await getCodes('education_stage'))[0].id;
    careerInterests = await getCodes('career_interest');
  });

  describe('learning_goal master data', () => {
    const expectedCodes = [
      'university_career',
      'job_transition',
      'deeper_understanding',
      'core_skills',
      'other',
    ];

    it('should return the five Vietnamese labels in display order', async () => {
      const codes = await getCodes('learning_goal', 'vi');

      expect(codes.map((code) => code.code)).toEqual(expectedCodes);
      expect(codes.map((code) => code.name)).toEqual([
        'Tìm ngành nghề phù hợp khi đang học đại học',
        'Tìm ngành nghề phù hợp để chuyển đổi công việc',
        'Hiểu sâu hơn về một ngành nghề cụ thể',
        'Xây dựng kỹ năng và dự án để tìm việc',
        'Khác',
      ]);
      expect(codes.map((code) => code.displayOrder)).toEqual([1, 2, 3, 4, 5]);
      expect(codes.every((code) => code.isActive)).toBe(true);
    });

    it('should return the five English labels', async () => {
      const codes = await getCodes('learning_goal', 'en');

      expect(codes.map((code) => code.code)).toEqual(expectedCodes);
      expect(codes.map((code) => code.name)).toEqual([
        'Find the right career while at university',
        'Find the right career to transition jobs',
        'Deepen my understanding of a specific career',
        'Build core skills and projects that help me get a job',
        'Other',
      ]);
    });

    it('should fall back to Vietnamese for an unsupported locale', async () => {
      const codes = await getCodes('learning_goal', 'fr');

      expect(codes[3].name).toBe('Xây dựng kỹ năng và dự án để tìm việc');
    });
  });

  describe('validation and persistence', () => {
    const submit = (payload: Record<string, unknown>, bearer = token) =>
      request(app)
        .patch('/api/v1/auth/profile/onboarding')
        .auth(bearer, { type: 'bearer' })
        .send(payload);

    it('should reject a missing currentStatusCode and leave onboarding incomplete', async () => {
      const secondToken = await register('missing-status');
      const payload: Partial<ReturnType<typeof validPayload>> = validPayload();
      delete payload.currentStatusCode;

      await submit(payload, secondToken)
        .expect(422)
        .expect(({ body }) => {
          expect(body.errors.currentStatusCode).toBe(
            'Please select your current status',
          );
        });

      await request(app)
        .get('/api/v1/auth/profile/me')
        .auth(secondToken, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.user.onboardingDone).toBe(false);
          expect(body.studentProfile.currentStatus).toBeNull();
          expect(body.careerInterests).toEqual([]);
        });
    });

    it.each(['does_not_exist', 'technology'])(
      'should reject currentStatusCode=%s when it is absent from learning_goal',
      async (currentStatusCode) => {
        await submit({ ...validPayload(), currentStatusCode })
          .expect(422)
          .expect(({ body }) => {
            expect(body.errors.currentStatusCode).toBeDefined();
          });
      },
    );

    it('should require customStatus when current status is other', async () => {
      await submit({
        ...validPayload(),
        currentStatusCode: 'other',
        customStatus: '   ',
      })
        .expect(422)
        .expect(({ body }) => {
          expect(body.errors.customStatus).toBe(
            'Please describe your current status',
          );
        });
    });

    it('should reject customStatus longer than 200 characters', async () => {
      await submit({
        ...validPayload(),
        currentStatusCode: 'other',
        customStatus: 'x'.repeat(201),
      })
        .expect(422)
        .expect(({ body }) => {
          expect(body.errors.customStatus).toBeDefined();
        });
    });

    it('should reject more than five career interests', async () => {
      expect(careerInterests.length).toBeGreaterThan(5);

      await submit({
        ...validPayload(),
        careerInterestIds: careerInterests.slice(0, 6).map((code) => code.id),
      })
        .expect(422)
        .expect(({ body }) => {
          expect(body.errors.careerInterestIds).toContain('5');
        });
    });

    it('should reject duplicate career interests', async () => {
      await submit({
        ...validPayload(),
        careerInterestIds: [careerInterests[0].id, careerInterests[0].id],
      })
        .expect(422)
        .expect(({ body }) => {
          expect(body.errors.careerInterestIds).toContain('duplicates');
        });
    });

    it('should persist a valid submission and return localized currentStatus', async () => {
      await submit(validPayload())
        .set('X-Locale', 'vi')
        .expect(200)
        .expect(({ body }) => {
          expect(body.user.onboardingDone).toBe(true);
          expect(body.studentProfile.currentStatus).toEqual({
            code: 'core_skills',
            name: 'Xây dựng kỹ năng và dự án để tìm việc',
            customLabel: null,
          });
          expect(body.careerInterests).toHaveLength(1);
        });

      await request(app)
        .get('/api/v1/auth/profile/me')
        .auth(token, { type: 'bearer' })
        .set('X-Locale', 'en')
        .expect(200)
        .expect(({ body }) => {
          expect(body.studentProfile.currentStatus).toEqual({
            code: 'core_skills',
            name: 'Build core skills and projects that help me get a job',
            customLabel: null,
          });
        });
    });
  });
});
