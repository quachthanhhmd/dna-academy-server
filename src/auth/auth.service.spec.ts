import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UnprocessableEntityException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthProvidersEnum } from './auth-providers.enum';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';

describe('AuthService', () => {
  let service: AuthService;

  let jwtService: { signAsync: jest.Mock<any> };
  let usersService: {
    findByEmail: jest.Mock<any>;
    findById: jest.Mock<any>;
    create: jest.Mock<any>;
    update: jest.Mock<any>;
  };
  let sessionService: { create: jest.Mock<any> };
  let configService: { getOrThrow: jest.Mock<any> };
  let oauthAccountsService: {
    findByProviderAndProviderUid: jest.Mock<any>;
    create: jest.Mock<any>;
  };
  let studentProfilesService: {
    findByUserId: jest.Mock<any>;
    create: jest.Mock<any>;
    update: jest.Mock<any>;
  };
  let studentCareerInterestsService: {
    findByUserId: jest.Mock<any>;
    create: jest.Mock<any>;
    remove: jest.Mock<any>;
  };
  let masterDataCodesService: { findById: jest.Mock<any> };

  const educationStageCode = {
    id: 'edu-1',
    code: 'high_school',
    isActive: true,
    group: { groupKey: 'education_stage' },
  };

  const careerInterestCode = {
    id: 'career-1',
    code: 'engineering',
    isActive: true,
    group: { groupKey: 'career_interest' },
  };

  const otherCareerInterestCode = {
    id: 'career-other',
    code: 'Other',
    isActive: true,
    group: { groupKey: 'career_interest' },
  };

  const baseUser = {
    id: 1,
    email: 'student@example.com',
    fullName: 'Jane Student',
    role: { id: RoleEnum.user },
    status: { id: StatusEnum.active },
    onboardingDone: false,
    age: null,
    dateOfBirth: null,
  };

  beforeEach(() => {
    jwtService = {
      signAsync: (jest.fn() as jest.Mock<any>).mockResolvedValue(
        'signed-token',
      ),
    };

    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    sessionService = {
      create: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        id: 'session-1',
      }),
    };

    configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key.endsWith('Expires')) return '1h';
        if (key.endsWith('Secret')) return 'secret';
        if (key === 'auth.expires') return '1h';
        return 'value';
      }),
    };

    oauthAccountsService = {
      findByProviderAndProviderUid: jest.fn(),
      create: jest.fn(),
    };

    studentProfilesService = {
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    studentCareerInterestsService = {
      findByUserId: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
      create: jest.fn(),
      remove: jest.fn(),
    };

    masterDataCodesService = { findById: jest.fn() };

    service = new AuthService(
      jwtService as any,
      usersService as any,
      sessionService as any,
      {} as any, // mailService, unused by the paths under test
      configService as any,
      oauthAccountsService as any,
      studentProfilesService as any,
      studentCareerInterestsService as any,
      masterDataCodesService as any,
    );
  });

  describe('validateFacebookLogin', () => {
    it('should log in via the existing oauth_accounts link without overwriting the user', async () => {
      const linkedUser = { ...baseUser, onboardingDone: true };
      oauthAccountsService.findByProviderAndProviderUid.mockResolvedValue({
        id: 'oauth-1',
        provider: AuthProvidersEnum.facebook,
        providerUid: 'fb-123',
        user: linkedUser,
      });

      const result = await service.validateFacebookLogin({
        id: 'fb-123',
        email: 'student@example.com',
        firstName: 'Jane',
        lastName: 'Student',
      });

      expect(
        oauthAccountsService.findByProviderAndProviderUid,
      ).toHaveBeenCalledWith(AuthProvidersEnum.facebook, 'fb-123');
      expect(usersService.create).not.toHaveBeenCalled();
      expect(usersService.update).not.toHaveBeenCalled();
      expect(oauthAccountsService.create).not.toHaveBeenCalled();
      expect(result.user).toBe(linkedUser);
      expect(result.requiresOnboarding).toBe(false);
    });

    it('should link a new oauth_accounts row to an existing user found by email', async () => {
      oauthAccountsService.findByProviderAndProviderUid.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(baseUser);

      const result = await service.validateFacebookLogin({
        id: 'fb-456',
        email: 'Student@example.com',
        firstName: 'Jane',
        lastName: 'Student',
      });

      expect(usersService.create).not.toHaveBeenCalled();
      expect(oauthAccountsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: AuthProvidersEnum.facebook,
          providerUid: 'fb-456',
          user: baseUser,
        }),
      );
      expect(result.user).toBe(baseUser);
      expect(result.requiresOnboarding).toBe(true);
    });

    it('should create a new user + oauth_accounts link on first-time Facebook login', async () => {
      oauthAccountsService.findByProviderAndProviderUid.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      const createdUser = { ...baseUser, id: 2 };
      usersService.create.mockResolvedValue(createdUser);

      const result = await service.validateFacebookLogin({
        id: 'fb-789',
        email: 'new.student@example.com',
        firstName: 'New',
        lastName: 'Student',
        picture: 'https://example.com/pic.jpg',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new.student@example.com',
          fullName: 'New Student',
          profilePictureUrl: 'https://example.com/pic.jpg',
          emailVerified: true,
          onboardingDone: false,
          provider: AuthProvidersEnum.facebook,
        }),
      );
      expect(oauthAccountsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: AuthProvidersEnum.facebook,
          providerUid: 'fb-789',
          user: createdUser,
        }),
      );
      expect(result.user).toBe(createdUser);
      expect(result.requiresOnboarding).toBe(true);
    });
  });

  describe('completeOnboarding', () => {
    const onboardingDto = {
      educationStageCodeId: 'edu-1',
      careerInterestIds: ['career-1'],
      age: 16,
    };

    beforeEach(() => {
      usersService.findById.mockResolvedValue({ ...baseUser });
      masterDataCodesService.findById.mockImplementation((id: string) => {
        if (id === 'edu-1') return Promise.resolve(educationStageCode);
        if (id === 'career-1') return Promise.resolve(careerInterestCode);
        if (id === 'career-other')
          return Promise.resolve(otherCareerInterestCode);
        return Promise.resolve(null);
      });
      studentProfilesService.findByUserId.mockResolvedValue(null);
    });

    it('should reject an educationStageCodeId that does not belong to the education_stage group', async () => {
      masterDataCodesService.findById.mockImplementation((id: string) =>
        id === 'edu-1'
          ? Promise.resolve({
              ...educationStageCode,
              group: { groupKey: 'career_interest' },
            })
          : Promise.resolve(careerInterestCode),
      );

      await expect(
        service.completeOnboarding(1, onboardingDto as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should reject an inactive educationStageCodeId', async () => {
      masterDataCodesService.findById.mockImplementation((id: string) =>
        id === 'edu-1'
          ? Promise.resolve({ ...educationStageCode, isActive: false })
          : Promise.resolve(careerInterestCode),
      );

      await expect(
        service.completeOnboarding(1, onboardingDto as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should reject a careerInterestIds entry that does not exist', async () => {
      masterDataCodesService.findById.mockImplementation((id: string) =>
        id === 'edu-1'
          ? Promise.resolve(educationStageCode)
          : Promise.resolve(null),
      );

      await expect(
        service.completeOnboarding(1, onboardingDto as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should reject when neither age nor dateOfBirth is provided or already on file', async () => {
      await expect(
        service.completeOnboarding(1, {
          educationStageCodeId: 'edu-1',
          careerInterestIds: ['career-1'],
        } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should allow omitting age/dateOfBirth when the user already has one on file', async () => {
      usersService.findById.mockResolvedValue({ ...baseUser, age: 17 });

      await expect(
        service.completeOnboarding(1, {
          educationStageCodeId: 'edu-1',
          careerInterestIds: ['career-1'],
        } as any),
      ).resolves.toBeDefined();
    });

    it('should create a new student profile, replace career interests, and mark onboarding done', async () => {
      const existingInterest = { id: 'existing-interest' };
      studentCareerInterestsService.findByUserId.mockResolvedValue([
        existingInterest,
      ]);

      await service.completeOnboarding(1, onboardingDto as any);

      expect(studentProfilesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: 1 },
          educationStageCode,
        }),
      );
      expect(studentProfilesService.update).not.toHaveBeenCalled();

      expect(studentCareerInterestsService.remove).toHaveBeenCalledWith(
        'existing-interest',
      );
      expect(studentCareerInterestsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: 1 },
          careerInterest: careerInterestCode,
          customInterest: null,
        }),
      );

      expect(usersService.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ age: 16, onboardingDone: true }),
      );
    });

    it('should update an existing student profile instead of creating a duplicate', async () => {
      studentProfilesService.findByUserId.mockResolvedValue({
        id: 'profile-1',
      });

      await service.completeOnboarding(1, onboardingDto as any);

      expect(studentProfilesService.update).toHaveBeenCalledWith(
        'profile-1',
        expect.objectContaining({ educationStageCode }),
      );
      expect(studentProfilesService.create).not.toHaveBeenCalled();
    });

    it('should store customInterest only for the "Other" career interest code', async () => {
      await service.completeOnboarding(1, {
        educationStageCodeId: 'edu-1',
        careerInterestIds: ['career-1', 'career-other'],
        age: 16,
        customInterest: 'Robotics',
      } as any);

      expect(studentCareerInterestsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          careerInterest: careerInterestCode,
          customInterest: null,
        }),
      );
      expect(studentCareerInterestsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          careerInterest: otherCareerInterestCode,
          customInterest: 'Robotics',
        }),
      );
    });
  });
});
