import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin } from '../utils/admin';
import { deactivateMasterDataCodes } from '../utils/cleanup';

describe('Student Onboarding (Epic 1)', () => {
  const app = APP_URL;
  const runId = Date.now();

  let educationStageCodeId: string;
  let otherEducationStageCodeId: string;
  let careerInterestCodeId: string;
  let otherCareerInterestCodeId: string;

  let adminToken: string;
  const createdCodes: { groupKey: string; id: string }[] = [];

  const registerAndLogin = async (email: string, password = 'secret') => {
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'Onboarding', lastName: 'Tester' })
      .expect(204);

    return request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password })
      .then(({ body }) => body.token as string);
  };

  /**
   * Fixture codes go in through the admin route, as real master data does. The
   * generated `/master-data-groups` and `/master-data-codes` writes this suite
   * used to call were open to any logged-in user — permission model §1.10.
   */
  const createMasterDataCode = async (
    groupKey: string,
    code: string,
    name: string,
  ) => {
    const { body: masterDataCode } = await request(app)
      .post(`/api/v1/admin/master-data/groups/${groupKey}/codes`)
      .auth(adminToken, { type: 'bearer' })
      .send({ displayOrder: 1, isActive: true, name: `${name} ${runId}`, code })
      .expect(201);

    createdCodes.push({ groupKey, id: masterDataCode.id as string });

    return masterDataCode.id as string;
  };

  beforeAll(async () => {
    adminToken = await loginSeededSuperAdmin(app);

    // PATCH /auth/profile/onboarding hardcodes these exact group keys, so the
    // codes used in onboarding assertions must live under them.
    educationStageCodeId = await createMasterDataCode(
      'education_stage',
      `high_school_${runId}`,
      'High School',
    );
    otherEducationStageCodeId = await createMasterDataCode(
      'education_stage',
      `university_${runId}`,
      'University',
    );
    careerInterestCodeId = await createMasterDataCode(
      'career_interest',
      `engineering_${runId}`,
      'Engineering',
    );
    otherCareerInterestCodeId = await createMasterDataCode(
      'career_interest',
      'other',
      'Other',
    );
  });

  afterAll(async () => {
    for (const groupKey of ['education_stage', 'career_interest']) {
      await deactivateMasterDataCodes(
        app,
        adminToken,
        groupKey,
        createdCodes.filter((c) => c.groupKey === groupKey).map((c) => c.id),
      );
    }
  });

  describe('GET /master-data-codes?groupKey=... (FE dropdown source)', () => {
    it('should only return codes belonging to the requested group', async () => {
      const { body } = await request(app)
        .get('/api/v1/master-data-codes?groupKey=career_interest&limit=50')
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      const ids = body.data.map((code) => code.id);
      expect(ids).toContain(careerInterestCodeId);
      expect(ids).not.toContain(educationStageCodeId);
      body.data.forEach((code) => {
        expect(code.group.groupKey).toBe('career_interest');
      });
    });
  });

  describe('New user before onboarding', () => {
    let token: string;
    const email = `onboarding.new.${runId}@example.com`;

    beforeAll(async () => {
      token = await registerAndLogin(email);
    });

    it('should mark the session as requiring onboarding on login', async () => {
      await request(app)
        .post('/api/v1/auth/email/login')
        .send({ email, password: 'secret' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.requiresOnboarding).toBe(true);
        });
    });

    it('should auto-create an (empty) student profile on registration: GET /auth/profile/me', async () => {
      await request(app)
        .get('/api/v1/auth/profile/me')
        .auth(token, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.user.onboardingDone).toBe(false);
          // FE pre-populates the onboarding form from this field — must be
          // present, which requires the 'me' serialization group.
          expect(body.user.email).toBe(email);
          expect(body.studentProfile).not.toBeNull();
          expect(body.careerInterests).toEqual([]);
        });
    });

    it('should block enrollment with 403 ONBOARDING_REQUIRED: POST /courses/:slug/enroll', async () => {
      // The real enrolment route. The generated /enrollments CRUD used to be
      // reachable by any logged-in user; it is admin-only now, so asserting
      // the onboarding guard there would only prove the permission guard.
      await request(app)
        .post('/api/v1/courses/any-slug/enroll')
        .auth(token, { type: 'bearer' })
        .send({})
        .expect(403)
        .expect(({ body }) => {
          expect(body.code).toBe('ONBOARDING_REQUIRED');
        });
    });

    it('should reject an unknown educationStageCodeId: PATCH /auth/profile/onboarding', async () => {
      await request(app)
        .patch('/api/v1/auth/profile/onboarding')
        .auth(token, { type: 'bearer' })
        .send({
          educationStageCodeId: '00000000-0000-0000-0000-000000000000',
          careerInterestIds: [careerInterestCodeId],
          age: 16,
        })
        .expect(422)
        .expect(({ body }) => {
          expect(body.errors.educationStageCodeId).toBeDefined();
        });
    });

    it('should reject an educationStageCodeId from the wrong group', async () => {
      await request(app)
        .patch('/api/v1/auth/profile/onboarding')
        .auth(token, { type: 'bearer' })
        .send({
          // this id belongs to career_interest, not education_stage
          educationStageCodeId: careerInterestCodeId,
          careerInterestIds: [careerInterestCodeId],
          age: 16,
        })
        .expect(422)
        .expect(({ body }) => {
          expect(body.errors.educationStageCodeId).toBeDefined();
        });
    });

    it('should reject an unknown careerInterestIds entry', async () => {
      await request(app)
        .patch('/api/v1/auth/profile/onboarding')
        .auth(token, { type: 'bearer' })
        .send({
          educationStageCodeId,
          careerInterestIds: ['00000000-0000-0000-0000-000000000000'],
          age: 16,
        })
        .expect(422)
        .expect(({ body }) => {
          expect(body.errors.careerInterestIds).toBeDefined();
        });
    });

    it('should reject the request when neither age nor dateOfBirth is provided', async () => {
      await request(app)
        .patch('/api/v1/auth/profile/onboarding')
        .auth(token, { type: 'bearer' })
        .send({
          educationStageCodeId,
          careerInterestIds: [careerInterestCodeId],
        })
        .expect(422)
        .expect(({ body }) => {
          expect(body.errors.age).toBeDefined();
        });
    });

    it('should complete onboarding, store the custom interest for "Other", and unblock enrollment', async () => {
      await request(app)
        .patch('/api/v1/auth/profile/onboarding')
        .auth(token, { type: 'bearer' })
        .send({
          educationStageCodeId,
          careerInterestIds: [careerInterestCodeId, otherCareerInterestCodeId],
          age: 16,
          customInterest: 'Robotics',
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body.user.onboardingDone).toBe(true);
          expect(body.user.age).toBe(16);
          expect(body.studentProfile.educationStageCode.id).toBe(
            educationStageCodeId,
          );
          expect(body.careerInterests).toHaveLength(2);

          const other = body.careerInterests.find(
            (interest) =>
              interest.careerInterest.id === otherCareerInterestCodeId,
          );
          expect(other.customInterest).toBe('Robotics');

          const notOther = body.careerInterests.find(
            (interest) => interest.careerInterest.id === careerInterestCodeId,
          );
          expect(notOther.customInterest).toBeNull();
        });

      await request(app)
        .get('/api/v1/auth/profile/me')
        .auth(token, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.user.onboardingDone).toBe(true);
        });

      // Re-attempting enrolment for the now onboarding-complete student
      // should clear the guard and fall through to "no such course".
      await request(app)
        .post('/api/v1/courses/any-slug/enroll')
        .auth(token, { type: 'bearer' })
        .send({})
        .expect(404);
    });

    it('should replace career interests on a second onboarding submission instead of appending', async () => {
      await request(app)
        .patch('/api/v1/auth/profile/onboarding')
        .auth(token, { type: 'bearer' })
        .send({
          educationStageCodeId: otherEducationStageCodeId,
          careerInterestIds: [careerInterestCodeId],
          age: 17,
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body.careerInterests).toHaveLength(1);
          expect(body.careerInterests[0].careerInterest.id).toBe(
            careerInterestCodeId,
          );
          expect(body.studentProfile.educationStageCode.id).toBe(
            otherEducationStageCodeId,
          );
        });
    });
  });
});
