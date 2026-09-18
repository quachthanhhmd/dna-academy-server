import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  ConflictException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
    findBySocialIdAndProvider: jest.Mock<any>;
    create: jest.Mock<any>;
    update: jest.Mock<any>;
    clearPassword: jest.Mock<any>;
  };
  let sessionService: {
    create: jest.Mock<any>;
    deleteByUserId: jest.Mock<any>;
    findById: jest.Mock<any>;
    deleteById: jest.Mock<any>;
    updateByHash: jest.Mock<any>;
  };
  let mailService: {
    userSignUp: jest.Mock<any>;
    forgotPassword: jest.Mock<any>;
    confirmNewEmail: jest.Mock<any>;
  };
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
  let userRolesService: { findByUserId: jest.Mock<any> };
  let rolePermissionsService: { findByRoleId: jest.Mock<any> };

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
    emailVerified: true,
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
      findBySocialIdAndProvider: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      clearPassword: jest.fn(),
    };

    sessionService = {
      create: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        id: 'session-1',
      }),
      deleteByUserId: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      updateByHash: jest.fn(),
    };

    mailService = {
      userSignUp: (jest.fn() as jest.Mock<any>).mockResolvedValue(undefined),
      forgotPassword: jest.fn(),
      confirmNewEmail: jest.fn(),
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

    // By default nobody holds an admin-panel permission.
    userRolesService = {
      findByUserId: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
    };
    rolePermissionsService = {
      findByRoleId: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
    };

    service = makeService();
  });

  /**
   * Token flows (reset, email change) are tested against a real JwtService:
   * what matters is what survives signing and verifying, which a mock would
   * simply echo back.
   */
  /** The hash the service put in the most recent email it sent. */
  function sentHash(sender: jest.Mock<any>): string {
    const calls = sender.mock.calls as [{ data: { hash: string } }][];

    return calls[calls.length - 1][0].data.hash;
  }

  function makeService(jwt: unknown = jwtService): AuthService {
    return new AuthService(
      jwt as any,
      usersService as any,
      sessionService as any,
      mailService as any,
      configService as any,
      oauthAccountsService as any,
      studentProfilesService as any,
      studentCareerInterestsService as any,
      masterDataCodesService as any,
      userRolesService as any,
      rolePermissionsService as any,
    );
  }

  /** Makes `userId` hold one admin-panel permission through one role. */
  function grantAdminPermission(userId: number): void {
    userRolesService.findByUserId.mockImplementation((id: unknown) =>
      Promise.resolve(id === userId ? [{ role: { id: 3 } }] : []),
    );
    rolePermissionsService.findByRoleId.mockImplementation((roleId: unknown) =>
      Promise.resolve(
        roleId === 3
          ? [{ permission: { module: { name: 'users' }, action: 'view' } }]
          : [],
      ),
    );
  }

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

    // A missing uid reaching the lookup would be dropped from `where` by
    // TypeORM, matching whichever Facebook-linked account comes first.
    it('should reject a profile without a provider id before looking anything up', async () => {
      await expect(
        service.validateFacebookLogin({ id: '', email: 'student@example.com' }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      expect(
        oauthAccountsService.findByProviderAndProviderUid,
      ).not.toHaveBeenCalled();
      expect(usersService.findByEmail).not.toHaveBeenCalled();
      expect(usersService.create).not.toHaveBeenCalled();
      expect(sessionService.create).not.toHaveBeenCalled();
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

  describe('resendVerificationEmail', () => {
    it('should reject when no user has the given email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.resendVerificationEmail('missing@example.com'),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(mailService.userSignUp).not.toHaveBeenCalled();
    });

    it('should reject when the account is already confirmed', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...baseUser,
        status: { id: StatusEnum.active },
      });

      await expect(
        service.resendVerificationEmail('student@example.com'),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(mailService.userSignUp).not.toHaveBeenCalled();
    });

    it('should sign a fresh confirm-email token and resend the sign-up email', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...baseUser,
        id: 42,
        status: { id: StatusEnum.inactive },
      });

      await service.resendVerificationEmail('student@example.com');

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { confirmEmailUserId: 42 },
        expect.objectContaining({ secret: 'secret', expiresIn: '1h' }),
      );
      expect(mailService.userSignUp).toHaveBeenCalledWith({
        to: 'student@example.com',
        data: { hash: 'signed-token' },
      });
    });
  });
  describe('resetPassword', () => {
    const account = {
      ...baseUser,
      password: '$2a$10$storedPasswordHashBeforeReset',
    };

    beforeEach(() => {
      service = makeService(new JwtService({}));
    });

    const issueResetHash = async (): Promise<string> => {
      usersService.findByEmail.mockResolvedValue(account);
      await service.forgotPassword(account.email);

      return sentHash(mailService.forgotPassword);
    };

    // Guard: the happy path must survive whatever makes links single-use.
    it('should set the new password and revokes sessions while the link is fresh', async () => {
      const hash = await issueResetHash();
      usersService.findById.mockResolvedValue({ ...account });

      await service.resetPassword(hash, 'new-secret');

      expect(sessionService.deleteByUserId).toHaveBeenCalledWith({
        userId: account.id,
      });
      expect(usersService.update).toHaveBeenCalledWith(
        account.id,
        expect.objectContaining({ password: 'new-secret' }),
      );
    });

    // A reset link sits in an inbox, browser history and possibly a proxy log.
    // Once the password has changed — through this link or any other way —
    // the link must stop working, not keep working until it expires.
    it('should reject a link once the stored password has changed', async () => {
      const hash = await issueResetHash();
      usersService.findById.mockResolvedValue({
        ...account,
        password: '$2a$10$storedPasswordHashAfterReset',
      });

      await expect(
        service.resetPassword(hash, 'replayed-secret'),
      ).rejects.toMatchObject({
        response: { errors: { hash: 'invalidHash' } },
      });
      expect(usersService.update).not.toHaveBeenCalled();
      expect(sessionService.deleteByUserId).not.toHaveBeenCalled();
    });

    // Guard: an account with no password yet (social sign-up) can still set one.
    it('should work for an account that has no password yet', async () => {
      const passwordless = { ...account, password: null };
      usersService.findByEmail.mockResolvedValue(passwordless);
      await service.forgotPassword(passwordless.email);
      const hash = sentHash(mailService.forgotPassword);
      usersService.findById.mockResolvedValue({ ...passwordless });

      await service.resetPassword(hash, 'first-secret');

      expect(usersService.update).toHaveBeenCalled();
    });
  });
  describe('confirmNewEmail', () => {
    const account = {
      ...baseUser,
      email: 'original@example.com',
      password: '$2a$10$storedPasswordHash',
    };

    beforeEach(() => {
      service = makeService(new JwtService({}));
    });

    const requestEmailChange = async (to: string): Promise<string> => {
      usersService.findById.mockResolvedValue({ ...account });
      usersService.findByEmail.mockResolvedValue(null);
      await service.update(
        {
          id: account.id,
          role: account.role,
          sessionId: 'session-1',
          iat: 0,
          exp: 0,
        },
        { email: to },
      );
      usersService.update.mockClear();

      return sentHash(mailService.confirmNewEmail);
    };

    // Guard: a fresh link still moves the account to the new address.
    it('should move the account to the new email while the link is current', async () => {
      const hash = await requestEmailChange('next@example.com');
      usersService.findById.mockResolvedValue({ ...account });

      await service.confirmNewEmail(hash);

      expect(usersService.update).toHaveBeenCalledWith(
        account.id,
        expect.objectContaining({ email: 'next@example.com' }),
      );
    });

    // Once the email has changed — by confirming this link, or a later one —
    // an older link must not be able to move the account back. The address it
    // points at may be a typo or an abandoned inbox, where "forgot password"
    // would hand the account to whoever reads it.
    it('should reject a link once the account email has changed', async () => {
      const hash = await requestEmailChange('abandoned@example.com');
      usersService.findById.mockResolvedValue({
        ...account,
        email: 'kept@example.com',
      });

      await expect(service.confirmNewEmail(hash)).rejects.toMatchObject({
        response: { errors: { hash: 'invalidHash' } },
      });
      expect(usersService.update).not.toHaveBeenCalled();
    });

    // Both flows share a signing secret, so a sign-up confirmation token is a
    // validly signed JWT here too. It carries no new email and must not count.
    it('should reject a sign-up confirmation token', async () => {
      usersService.create.mockResolvedValue({ ...account });
      await service.register({
        email: account.email,
        password: 'secret-123',
        firstName: 'Jane',
        lastName: 'Student',
      });
      const signUpHash = sentHash(mailService.userSignUp);
      usersService.findById.mockResolvedValue({ ...account });

      await expect(service.confirmNewEmail(signUpHash)).rejects.toMatchObject({
        response: { errors: { hash: 'invalidHash' } },
      });
      expect(usersService.update).not.toHaveBeenCalled();
    });
  });
  describe('refreshToken', () => {
    const presented = { sessionId: 'session-7', hash: 'rotated-away-hash' };

    // Guard: a current refresh token still rotates.
    it('should rotate the session hash and issue new tokens', async () => {
      sessionService.updateByHash.mockResolvedValue({
        id: 'session-7',
        user: { id: baseUser.id },
      });
      usersService.findById.mockResolvedValue(baseUser);

      const result = await service.refreshToken(presented);

      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(sessionService.deleteById).not.toHaveBeenCalled();
    });

    // A refresh token that has already been rotated is being presented by two
    // parties. The server cannot tell which is the thief, so it ends the
    // session for both — the legitimate user signs in again, the thief stays out.
    it('should revoke the session when an already-rotated token is replayed', async () => {
      sessionService.updateByHash.mockResolvedValue(null);
      sessionService.findById.mockResolvedValue({
        id: 'session-7',
        hash: 'current-hash',
        user: { id: baseUser.id },
      });

      await expect(service.refreshToken(presented)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(sessionService.deleteById).toHaveBeenCalledWith('session-7');
    });

    // Guard: an unknown or already-revoked session is simply refused.
    it('should refuse a session that no longer exists without touching anything', async () => {
      sessionService.updateByHash.mockResolvedValue(null);
      sessionService.findById.mockResolvedValue(null);

      await expect(service.refreshToken(presented)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(sessionService.deleteById).not.toHaveBeenCalled();
    });
  });
  describe('validateSocialLogin (Google)', () => {
    const google = AuthProvidersEnum.google;

    // A returning user is identified by their Google id, not their email. The
    // email Google reports can change — and once it may be an address the user
    // does not control, overwriting the account's email with it would route
    // "forgot password" to someone else.
    it('should not overwrite a returning user’s email with the one Google reports', async () => {
      const returning = { ...baseUser, email: 'kept@example.com' };
      usersService.findBySocialIdAndProvider.mockResolvedValue(returning);
      usersService.findByEmail.mockResolvedValue(null);

      await service.validateSocialLogin(google, {
        id: 'google-1',
        email: 'reported@example.com',
      });

      expect(usersService.update).not.toHaveBeenCalledWith(
        returning.id,
        expect.objectContaining({ email: 'reported@example.com' }),
      );
    });
  });
  describe('linking a social identity to an existing account by email', () => {
    type Login = (email: string) => Promise<unknown>;

    const viaFacebook: Login = (email) => {
      oauthAccountsService.findByProviderAndProviderUid.mockResolvedValue(null);
      return service.validateFacebookLogin({ id: 'fb-link', email });
    };

    const viaGoogle: Login = (email) => {
      usersService.findBySocialIdAndProvider.mockResolvedValue(null);
      return service.validateSocialLogin(AuthProvidersEnum.google, {
        id: 'google-link',
        email,
      });
    };

    describe.each([
      ['Facebook', viaFacebook],
      ['Google', viaGoogle],
    ])('via %s', (_provider, login) => {
      // Pre-account hijacking: someone registers the victim's address with a
      // password and never verifies it — login does not require verification,
      // so they can use the account at once. When the real owner later signs
      // in with a provider that vouches for the address, they are linked into
      // that account while the squatter still knows its password.
      it('should strip the password and sessions of an unverified account before linking', async () => {
        const squatted = {
          ...baseUser,
          id: 41,
          emailVerified: false,
          status: { id: StatusEnum.inactive },
        };
        usersService.findByEmail.mockResolvedValue(squatted);

        await login(squatted.email);

        expect(usersService.clearPassword).toHaveBeenCalledWith(squatted.id);
        expect(sessionService.deleteByUserId).toHaveBeenCalledWith({
          userId: squatted.id,
        });
        expect(usersService.update).toHaveBeenCalledWith(
          squatted.id,
          expect.objectContaining({
            emailVerified: true,
            status: { id: StatusEnum.active },
          }),
        );
        // The squatter's sessions are gone before the owner's is created.
        expect(
          sessionService.deleteByUserId.mock.invocationCallOrder[0],
        ).toBeLessThan(sessionService.create.mock.invocationCallOrder[0]);
      });

      // Guard: an account whose owner already proved the address keeps its
      // password and its other sessions.
      it('should leave a verified account’s password and sessions alone', async () => {
        usersService.findByEmail.mockResolvedValue({ ...baseUser, id: 42 });

        await login(baseUser.email);

        expect(usersService.clearPassword).not.toHaveBeenCalled();
        expect(sessionService.deleteByUserId).not.toHaveBeenCalled();
      });

      // An admin session is the most valuable thing a look-alike or compromised
      // social account could be turned into. Staff link a provider from their
      // profile, after signing in with their password.
      it('should refuse to auto-link an account that holds an admin-panel permission', async () => {
        const admin = { ...baseUser, id: 43 };
        usersService.findByEmail.mockResolvedValue(admin);
        grantAdminPermission(admin.id);

        const attempt = login(admin.email);

        await expect(attempt).rejects.toBeInstanceOf(ConflictException);
        await expect(attempt).rejects.toMatchObject({
          response: { error: 'social_link_requires_password' },
        });
        expect(oauthAccountsService.create).not.toHaveBeenCalled();
        expect(sessionService.create).not.toHaveBeenCalled();
        expect(usersService.clearPassword).not.toHaveBeenCalled();
      });
    });

    // Guard: the admin rule is about creating a link, not using one. Staff who
    // already linked a provider keep signing in with it.
    it('should still sign in an admin through a link that already exists (Facebook)', async () => {
      const admin = { ...baseUser, id: 44 };
      grantAdminPermission(admin.id);
      oauthAccountsService.findByProviderAndProviderUid.mockResolvedValue({
        id: 'oauth-admin',
        provider: AuthProvidersEnum.facebook,
        providerUid: 'fb-admin',
        user: admin,
      });

      const result = (await service.validateFacebookLogin({
        id: 'fb-admin',
        email: admin.email,
      })) as { user: unknown };

      expect(result.user).toBe(admin);
    });

    it('should still sign in an admin through a link that already exists (Google)', async () => {
      const admin = { ...baseUser, id: 45 };
      grantAdminPermission(admin.id);
      usersService.findBySocialIdAndProvider.mockResolvedValue(admin);

      const result = (await service.validateSocialLogin(
        AuthProvidersEnum.google,
        { id: 'google-admin', email: admin.email },
      )) as { user: unknown };

      expect(result.user).toBe(admin);
    });
  });
});
