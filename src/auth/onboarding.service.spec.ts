import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UnprocessableEntityException } from '@nestjs/common';
import { StudentCareerInterestEntity } from '../student-career-interests/infrastructure/persistence/relational/entities/student-career-interest.entity';
import { StudentProfileEntity } from '../student-profiles/infrastructure/persistence/relational/entities/student-profile.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let usersService: { findById: jest.Mock<any>; findByEmail: jest.Mock<any> };
  let masterDataCodesService: {
    findById: jest.Mock<any>;
    findByIds: jest.Mock<any>;
    findByGroupKeyAndCode: jest.Mock<any>;
  };
  let configService: { get: jest.Mock<any> };
  let profileRepository: Record<string, jest.Mock<any>>;
  let interestRepository: Record<string, jest.Mock<any>>;
  let userRepository: Record<string, jest.Mock<any>>;
  let dataSource: { transaction: jest.Mock<any> };

  const code = (id: string, value: string, groupKey: string) => ({
    id,
    code: value,
    name: value,
    isActive: true,
    group: { groupKey },
  });
  const education = code('edu-1', 'university', 'education_stage');
  const career = code('career-1', 'technology', 'career_interest');
  const careerOther = code('career-other', 'other', 'career_interest');
  const goal = code('goal-1', 'core_skills', 'learning_goal');
  const goalOther = code('goal-other', 'other', 'learning_goal');
  const dto = {
    educationStageCodeId: education.id,
    careerInterestIds: [career.id],
    currentStatusCode: goal.code,
    age: 25,
  };

  beforeEach(() => {
    usersService = {
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        id: 1,
        age: null,
        dateOfBirth: null,
        email: null,
      }),
      // Nothing takes the address by default — a specific test overrides
      // this to model the duplicate case.
      findByEmail: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
    };
    masterDataCodesService = {
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue(education),
      findByIds: (jest.fn() as jest.Mock<any>).mockResolvedValue([career]),
      findByGroupKeyAndCode: (jest.fn() as jest.Mock<any>).mockResolvedValue(
        goal,
      ),
    };
    configService = {
      get: (jest.fn() as jest.Mock<any>).mockReturnValue(5),
    };
    profileRepository = {
      findOne: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: (jest.fn() as jest.Mock<any>).mockResolvedValue(undefined),
    };
    interestRepository = {
      create: jest.fn((value) => value),
      delete: (jest.fn() as jest.Mock<any>).mockResolvedValue(undefined),
      save: (jest.fn() as jest.Mock<any>).mockResolvedValue(undefined),
    };
    userRepository = {
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue(undefined),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === StudentProfileEntity) return profileRepository;
        if (entity === StudentCareerInterestEntity) return interestRepository;
        if (entity === UserEntity) return userRepository;
        throw new Error('Unexpected repository');
      }),
    };
    dataSource = {
      transaction: jest.fn((callback: (value: unknown) => unknown) =>
        callback(manager),
      ),
    };

    service = new OnboardingService(
      usersService as any,
      masterDataCodesService as any,
      configService as any,
      dataSource as any,
    );
  });

  const errorsOf = async (promise: Promise<unknown>) => {
    try {
      await promise;
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      return (error as UnprocessableEntityException).getResponse() as {
        errors: Record<string, string>;
      };
    }
  };

  it('should reject a missing current-status code', async () => {
    masterDataCodesService.findByGroupKeyAndCode.mockResolvedValue(null);

    const response = await errorsOf(service.complete(1, dto as any));

    expect(response.errors.currentStatusCode).toBe(
      'Please select your current status',
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('should reject a blank current-status code', async () => {
    // The DTO carries a single @IsString so its message reaches the FE
    // unjoined; a whitespace-only code therefore arrives here and must be
    // rejected with the same wording rather than looked up as "".
    masterDataCodesService.findByGroupKeyAndCode.mockResolvedValue(null);

    const response = await errorsOf(
      service.complete(1, { ...dto, currentStatusCode: '   ' } as any),
    );

    expect(masterDataCodesService.findByGroupKeyAndCode).toHaveBeenCalledWith(
      'learning_goal',
      '',
    );
    expect(response.errors.currentStatusCode).toBe(
      'Please select your current status',
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('should reject a current-status code from the wrong group', async () => {
    masterDataCodesService.findByGroupKeyAndCode.mockResolvedValue({
      ...goal,
      group: { groupKey: 'career_interest' },
    });

    const response = await errorsOf(service.complete(1, dto as any));

    expect(response.errors.currentStatusCode).toBeDefined();
  });

  it('should reject an inactive current-status code', async () => {
    masterDataCodesService.findByGroupKeyAndCode.mockResolvedValue({
      ...goal,
      isActive: false,
    });

    const response = await errorsOf(service.complete(1, dto as any));

    expect(response.errors.currentStatusCode).toBeDefined();
  });

  it('should require and trim customStatus for the other goal', async () => {
    masterDataCodesService.findByGroupKeyAndCode.mockResolvedValue(goalOther);

    const missing = await errorsOf(
      service.complete(1, {
        ...dto,
        currentStatusCode: 'other',
        customStatus: '   ',
      } as any),
    );
    expect(missing.errors.customStatus).toBe(
      'Please describe your current status',
    );

    await service.complete(1, {
      ...dto,
      currentStatusCode: 'other',
      customStatus: '  Exploring research  ',
    } as any);
    expect(profileRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ customStatus: 'Exploring research' }),
    );
  });

  it('should reject customStatus longer than 200 characters', async () => {
    masterDataCodesService.findByGroupKeyAndCode.mockResolvedValue(goalOther);

    const response = await errorsOf(
      service.complete(1, {
        ...dto,
        currentStatusCode: 'other',
        customStatus: 'x'.repeat(201),
      } as any),
    );

    expect(response.errors.customStatus).toBe('Must be at most 200 characters');
  });

  it('should reject more career interests than MAX_CAREER_INTERESTS', async () => {
    const response = await errorsOf(
      service.complete(1, {
        ...dto,
        careerInterestIds: ['1', '2', '3', '4', '5', '6'],
      } as any),
    );

    expect(response.errors.careerInterestIds).toContain('5');
  });

  it('should reject duplicate career interests', async () => {
    const response = await errorsOf(
      service.complete(1, {
        ...dto,
        careerInterestIds: [career.id, career.id],
      } as any),
    );

    expect(response.errors.careerInterestIds).toContain('duplicates');
  });

  it('should reject missing, inactive, or wrong-group career interests', async () => {
    masterDataCodesService.findByIds.mockResolvedValue([
      { ...career, group: { groupKey: 'education_stage' } },
    ]);

    const response = await errorsOf(service.complete(1, dto as any));

    expect(response.errors.careerInterestIds).toBe(`notExists:${career.id}`);
  });

  it('should atomically replace profile and interests, then mark onboarding done', async () => {
    masterDataCodesService.findByIds.mockResolvedValue([career, careerOther]);

    await service.complete(1, {
      ...dto,
      careerInterestIds: [career.id, careerOther.id],
      customInterest: '  Robotics  ',
      customStatus: 'ignored for non-other',
    } as any);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(profileRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        educationStageCode: { id: education.id },
        currentStatusCode: { id: goal.id },
        customStatus: null,
      }),
    );
    expect(interestRepository.delete).toHaveBeenCalledWith({ user: { id: 1 } });
    expect(interestRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          careerInterest: { id: career.id },
          customInterest: null,
        }),
        expect.objectContaining({
          careerInterest: { id: careerOther.id },
          customInterest: 'Robotics',
        }),
      ]),
    );
    expect(userRepository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ onboardingDone: true, age: 25 }),
    );
  });

  it('should never mark onboarding done when an earlier transactional write fails', async () => {
    interestRepository.save.mockRejectedValue(new Error('insert failed'));

    await expect(service.complete(1, dto as any)).rejects.toThrow(
      'insert failed',
    );

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  describe('onboarding email persistence', () => {
    // The FB-signup with no email scope is the whole reason `dto.email` is
    // accepted here — verify every branch of `resolveEmailToPersist`, since
    // it touches account identity.

    it('should persist a new email with emailVerified: false when the account has none', async () => {
      await service.complete(1, { ...dto, email: '  New@Example.COM ' } as any);

      // Trimmed and lowercased before both the duplicate check and the
      // update, so what lands on the user row is the normalized form.
      expect(usersService.findByEmail).toHaveBeenCalledWith('new@example.com');
      const updateArg = userRepository.update.mock.calls[0][1];
      expect(updateArg).toEqual(
        expect.objectContaining({
          email: 'new@example.com',
          emailVerified: false,
          onboardingDone: true,
        }),
      );
    });

    it('should reject an email already used by another account', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 999,
        email: 'taken@example.com',
      });

      const response = await errorsOf(
        service.complete(1, { ...dto, email: 'taken@example.com' } as any),
      );

      expect(response.errors.email).toBe('emailAlreadyExists');
      // The transaction ran (validation succeeded up to this point) but the
      // user update must never have been called — the exception aborts it.
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should ignore a supplied email when the account already has one', async () => {
      usersService.findById.mockResolvedValue({
        id: 1,
        age: null,
        dateOfBirth: null,
        email: 'existing@example.com',
      });

      await service.complete(1, {
        ...dto,
        email: 'attempted-change@example.com',
      } as any);

      // No duplicate check because the branch returns early; no email or
      // emailVerified in the update payload either.
      expect(usersService.findByEmail).not.toHaveBeenCalled();
      const updateArg = userRepository.update.mock.calls[0][1];
      expect(updateArg).not.toHaveProperty('email');
      expect(updateArg).not.toHaveProperty('emailVerified');
    });

    it('should skip the email path entirely when the payload has none', async () => {
      // Same guard as above from the other direction — a payload without
      // `email` must not trigger any lookup or write of email fields.
      await service.complete(1, dto as any);

      expect(usersService.findByEmail).not.toHaveBeenCalled();
      const updateArg = userRepository.update.mock.calls[0][1];
      expect(updateArg).not.toHaveProperty('email');
      expect(updateArg).not.toHaveProperty('emailVerified');
    });
  });
});
