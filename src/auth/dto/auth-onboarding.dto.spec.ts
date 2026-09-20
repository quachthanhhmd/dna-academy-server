import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AuthOnboardingDto } from './auth-onboarding.dto';

const valid = {
  educationStageCodeId: 'df394fbb-0869-4cab-9630-7e93098b8419',
  careerInterestIds: ['b2ee06ba-2cec-4d9c-92ba-f90c4e6c62a7'],
  currentStatusCode: 'core_skills',
  age: 25,
};

describe('AuthOnboardingDto', () => {
  it('should require currentStatusCode with the FE-facing message', () => {
    const input: Partial<typeof valid> = { ...valid };
    delete input.currentStatusCode;
    const errors = validateSync(plainToInstance(AuthOnboardingDto, input));
    const error = errors.find((item) => item.property === 'currentStatusCode');

    // Exactly one constraint: the exception factory joins them all, so a
    // second failure here would reach the FE appended to this message.
    expect(Object.values(error?.constraints ?? {})).toEqual([
      'Please select your current status',
    ]);
  });

  it('should report duplicate career interests with the FE-facing message', () => {
    const errors = validateSync(
      plainToInstance(AuthOnboardingDto, {
        ...valid,
        careerInterestIds: [
          valid.careerInterestIds[0],
          valid.careerInterestIds[0],
        ],
      }),
    );
    const error = errors.find((item) => item.property === 'careerInterestIds');

    expect(Object.values(error?.constraints ?? {})).toContain(
      'Career interests must not contain duplicates',
    );
  });

  it('should reject duplicate career interest ids before persistence', () => {
    const errors = validateSync(
      plainToInstance(AuthOnboardingDto, {
        ...valid,
        careerInterestIds: [
          valid.careerInterestIds[0],
          valid.careerInterestIds[0],
        ],
      }),
    );

    expect(errors.map((error) => error.property)).toContain(
      'careerInterestIds',
    );
  });

  it('should accept currentStatusCode as a code rather than a UUID', () => {
    const errors = validateSync(plainToInstance(AuthOnboardingDto, valid));

    expect(errors).toEqual([]);
  });
});
