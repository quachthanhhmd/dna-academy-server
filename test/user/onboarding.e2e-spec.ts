import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';

describe('Student Onboarding (Epic 1)', () => {
  const app = APP_URL;
  const runId = Date.now();

  let educationStageCodeId: string;
  let otherEducationStageCodeId: string;
  let careerInterestCodeId: string;
  let otherCareerInterestCodeId: string;

  let setupToken: string;

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

  const createMasterDataGroup = async (token: string, groupKey: string) => {
    const { body: group } = await request(app)
      .post('/api/v1/master-data-groups')
      .auth(token, { type: 'bearer' })
      .send({
        displayOrder: 1,
        isActive: true,
        name: `${groupKey}-${runId}`,
        groupKey,
      })
      .expect(201);

    return group.id as string;
  };

  const createMasterDataCode = async (
    token: string,
    groupId: string,
    code: string,
    name: string,
  ) => {
    const { body: masterDataCode } = await request(app)
      .post('/api/v1/master-data-codes')
      .auth(token, { type: 'bearer' })
      .send({
        displayOrder: 1,
        isActive: true,
        name,
        code,
        group: { id: groupId },
      })
      .expect(201);

    return masterDataCode.id as string;
  };

  beforeAll(async () => {
    // Any authenticated user can create master data — use a throwaway account
    // to seed the lookup codes this suite needs.
    setupToken = await registerAndLogin(
      `onboarding.setup.${runId}@example.com`,
    );

    // PATCH /auth/profile/onboarding hardcodes these exact group keys, so the
    // codes used in onboarding assertions must live under them (not a per-run
    // suffixed key) even though multiple test runs will each add their own rows.
    const educationStageGroupId = await createMasterDataGroup(
      setupToken,
      'education_stage',
    );
    const careerInterestGroupId = await createMasterDataGroup(
      setupToken,
      'career_interest',
    );

    educationStageCodeId = await createMasterDataCode(
      setupToken,
      educationStageGroupId,
      `high_school_${runId}`,
      'High School',
    );
    otherEducationStageCodeId = await createMasterDataCode(
      setupToken,
      educationStageGroupId,
      `university_${runId}`,
      'University',
    );
    careerInterestCodeId = await createMasterDataCode(
      setupToken,
      careerInterestGroupId,
      `engineering_${runId}`,
      'Engineering',
    );
    otherCareerInterestCodeId = await createMasterDataCode(
      setupToken,
      careerInterestGroupId,
      'other',
      'Other',
    );
  });

  describe('GET /master-data-codes?groupKey=... (FE dropdown source)', () => {
    it('should only return codes belonging to the requested group', async () => {
      // Use a groupKey unique to this test (not the shared 'education_stage'
      // group, which accumulates rows across runs) so the result set is exact.
      const groupKey = `e2e_filter_test_${runId}`;
      const groupId = await createMasterDataGroup(setupToken, groupKey);
      const codeId = await createMasterDataCode(
        setupToken,
        groupId,
        'sample',
        'Sample',
      );

      const { body } = await request(app)
        .get(`/api/v1/master-data-codes?groupKey=${groupKey}&limit=50`)
        .auth(setupToken, { type: 'bearer' })
        .expect(200);

      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(codeId);
      expect(body.data[0].group.groupKey).toBe(groupKey);
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

    it('should block enrollment with 403 ONBOARDING_REQUIRED: POST /enrollments', async () => {
      await request(app)
        .post('/api/v1/enrollments')
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

      // Re-attempting enrollment for the now onboarding-complete student
      // should clear the guard and fail validation instead of 403.
      await request(app)
        .post('/api/v1/enrollments')
        .auth(token, { type: 'bearer' })
        .send({})
        .expect(422);
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
