import request from 'supertest';

/**
 * Every learning endpoint sits behind OnboardingGuard, so an e2e student that
 * has only registered gets 403 ONBOARDING_REQUIRED. The codes come from the
 * startup master-data seed, which guarantees both groups are populated.
 */
export const completeOnboarding = async (
  app: string,
  token: string,
): Promise<void> => {
  const codesFor = async (groupKey: string) => {
    const { body } = await request(app)
      .get(`/api/v1/master-data/codes?groupKey=${groupKey}`)
      .expect(200);

    if (!Array.isArray(body) || body.length === 0) {
      throw new Error(
        `master data group "${groupKey}" is empty — run the startup seed`,
      );
    }

    return body as { id: string; code: string }[];
  };

  const [stages, interests, goals] = await Promise.all([
    codesFor('education_stage'),
    codesFor('career_interest'),
    codesFor('learning_goal'),
  ]);

  await request(app)
    .patch('/api/v1/auth/profile/onboarding')
    .auth(token, { type: 'bearer' })
    .send({
      educationStageCodeId: stages[0].id,
      // One of age / dateOfBirth is required.
      age: 20,
      careerInterestIds: [interests[0].id],
      currentStatusCode: goals[0].code,
    })
    .expect(200);
};
