import {
  describe,
  expect,
  it,
  afterEach,
  beforeEach,
  jest,
} from '@jest/globals';
import bcrypt from 'bcryptjs';
import {
  ConflictException,
  ForbiddenException,
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
    instructorInvite: jest.Mock<any>;
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
  let userRolesService: {
    findByUserId: jest.Mock<any>;
    setRole: jest.Mock<any>;
  };
  let rolePermissionsService: { findByRoleId: jest.Mock<any> };
  let onboardingService: { complete: jest.Mock<any> };

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
      instructorInvite: (jest.fn() as jest.Mock<any>).mockResolvedValue(
        undefined,
      ),
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

    // By default nobody holds an admin-panel permission.
    userRolesService = {
      findByUserId: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
      setRole: (jest.fn() as jest.Mock<any>).mockResolvedValue(undefined),
    };
    rolePermissionsService = {
      findByRoleId: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
    };
    onboardingService = {
      complete: (jest.fn() as jest.Mock<any>).mockResolvedValue(undefined),
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
      userRolesService as any,
      rolePermissionsService as any,
      onboardingService as any,
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

  describe('completeOnboarding', () => {
    const onboardingDto = {
      educationStageCodeId: 'edu-1',
      careerInterestIds: ['career-1'],
      age: 16,
      currentStatusCode: 'core_skills',
    };

    beforeEach(() => {
      usersService.findById.mockResolvedValue({ ...baseUser });
      studentProfilesService.findByUserId.mockResolvedValue(null);
    });

    it('should persist all onboarding fields before rebuilding the profile response', async () => {
      await service.completeOnboarding(1, onboardingDto as any);

      expect(onboardingService.complete).toHaveBeenCalledWith(1, onboardingDto);
      expect(usersService.findById).toHaveBeenCalledWith(1);
    });

    it('should not build a success response when the transaction fails', async () => {
      onboardingService.complete.mockRejectedValue(new Error('rolled back'));

      await expect(
        service.completeOnboarding(1, onboardingDto as any),
      ).rejects.toThrow('rolled back');
      expect(usersService.findById).not.toHaveBeenCalled();
      expect(studentProfilesService.findByUserId).not.toHaveBeenCalled();
      expect(studentCareerInterestsService.findByUserId).not.toHaveBeenCalled();
    });

    it('should return the localized current status supplied by the profile mapper', async () => {
      studentProfilesService.findByUserId.mockResolvedValue({
        id: 'profile-1',
        currentStatus: {
          code: 'core_skills',
          name: 'Build core skills and projects that help me get a job',
          customLabel: null,
        },
      });

      const result = await service.completeOnboarding(1, onboardingDto as any);

      expect(result.studentProfile?.currentStatus).toEqual({
        code: 'core_skills',
        name: 'Build core skills and projects that help me get a job',
        customLabel: null,
      });
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
        data: { hash: 'signed-token', firstName: undefined },
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

    // §1.5 — following a link sent to the address proves the address.
    it('should mark the email verified and activate an unconfirmed account', async () => {
      const hash = await issueResetHash();
      usersService.findById.mockResolvedValue({
        ...account,
        emailVerified: false,
        status: { id: StatusEnum.inactive },
      });

      await service.resetPassword(hash, 'new-secret');

      expect(usersService.update).toHaveBeenCalledWith(account.id, {
        password: 'new-secret',
        emailVerified: true,
        status: { id: StatusEnum.active },
      });
    });

    // D9 — a password reset must not undo a deactivation.
    it('should leave a deactivated account deactivated', async () => {
      const hash = await issueResetHash();
      usersService.findById.mockResolvedValue({
        ...account,
        status: { id: StatusEnum.deactivated },
      });

      await service.resetPassword(hash, 'new-secret');

      const [, payload] = usersService.update.mock.calls[0] as [
        number,
        Record<string, unknown>,
      ];
      expect(payload.status).toBeUndefined();
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
  // §1.7 / §2.9 — an instructor account starts with no password; the invite
  // is a reset link with a longer life (O1: 72 hours).
  describe('sendPasswordInvite', () => {
    const invitee = {
      ...baseUser,
      id: 60,
      email: 'teacher@example.com',
      password: null,
    };

    beforeEach(() => {
      service = makeService(new JwtService({}));
    });

    it('should mail a link to the account email', async () => {
      await service.sendPasswordInvite(invitee);

      const [call] = mailService.instructorInvite.mock.calls[0] as [
        { to: string },
      ];
      expect(call.to).toBe('teacher@example.com');
    });

    it('should let the invitee set a password with it, once', async () => {
      await service.sendPasswordInvite(invitee);
      const hash = sentHash(mailService.instructorInvite);
      usersService.findById.mockResolvedValue({ ...invitee });

      await service.resetPassword(hash, 'chosen-secret');

      expect(usersService.update).toHaveBeenCalledWith(
        60,
        expect.objectContaining({ password: 'chosen-secret' }),
      );

      usersService.findById.mockResolvedValue({
        ...invitee,
        password: '$2a$10$nowSetHash',
      });
      await expect(
        service.resetPassword(hash, 'second-use'),
      ).rejects.toMatchObject({
        response: { errors: { hash: 'invalidHash' } },
      });
    });

    it('should expire after 72 hours', async () => {
      await service.sendPasswordInvite(invitee);
      const hash = sentHash(mailService.instructorInvite);
      const payload = JSON.parse(
        Buffer.from(hash.split('.')[1], 'base64url').toString(),
      );

      expect(payload.exp - payload.iat).toBe(72 * 3600);
    });
  });

  // Password guessing against one account, from however many addresses:
  // 10 failed attempts per 15 minutes. Failures only — someone who signs in
  // often is never locked out, and a success wipes the slate.
  describe('failed login limit', () => {
    let account: Record<string, unknown>;
    let now: number;

    beforeEach(() => {
      now = 9_000_000;
      jest.spyOn(Date, 'now').mockImplementation(() => now);
      account = {
        ...baseUser,
        id: 70,
        email: 'guessed@example.com',
        provider: AuthProvidersEnum.email,
        // bcrypt('right-password')
        password: bcrypt.hashSync('right-password', 4),
      };
      usersService.findByEmail.mockImplementation((email: unknown) =>
        Promise.resolve(email === account.email ? account : null),
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    const tryLogin = (password: string, email = 'guessed@example.com') =>
      service.validateLogin({ email, password }).then(
        () => 'ok',
        (error) => error.getStatus?.() ?? error,
      );

    it('should refuse the 11th attempt after 10 failures, even with the right password', async () => {
      for (let i = 0; i < 10; i += 1) {
        expect(await tryLogin('wrong')).toBe(422);
      }

      expect(await tryLogin('right-password')).toBe(429);
    });

    it('should count failures for an address with no account too', async () => {
      for (let i = 0; i < 10; i += 1) {
        expect(await tryLogin('x', 'nobody@example.com')).toBe(422);
      }

      expect(await tryLogin('x', 'nobody@example.com')).toBe(429);
    });

    it('should treat an email case-insensitively', async () => {
      for (let i = 0; i < 10; i += 1) {
        await tryLogin('wrong', 'Guessed@Example.com');
      }

      expect(await tryLogin('right-password')).toBe(429);
    });

    it('should clear the count on a successful login', async () => {
      for (let i = 0; i < 9; i += 1) {
        await tryLogin('wrong');
      }
      expect(await tryLogin('right-password')).toBe('ok');

      for (let i = 0; i < 9; i += 1) {
        expect(await tryLogin('wrong')).toBe(422);
      }
      expect(await tryLogin('right-password')).toBe('ok');
    });

    it('should let the account try again once the window has passed', async () => {
      for (let i = 0; i < 10; i += 1) {
        await tryLogin('wrong');
      }
      now += 15 * 60_000 + 1;

      expect(await tryLogin('right-password')).toBe('ok');
    });

    it('should not limit other emails', async () => {
      for (let i = 0; i < 10; i += 1) {
        await tryLogin('wrong');
      }

      expect(await tryLogin('x', 'someone-else@example.com')).toBe(422);
    });
  });

  describe('register', () => {
    beforeEach(() => {
      usersService.create.mockResolvedValue({ ...baseUser, id: 88 });
    });

    const register = () =>
      service.register({
        email: 'new@example.com',
        password: 'secret-123',
        firstName: 'New',
        lastName: 'Learner',
      });

    // Without a user_role row PermissionGuard sees no role at all (AC-6).
    it('should give the new account the User role', async () => {
      await register();

      expect(userRolesService.setRole).toHaveBeenCalledWith(
        88,
        RoleEnum.user,
        null,
      );
    });

    // The role is written only by setRole, never alongside the user row.
    it('should not pass a role to the user row', async () => {
      await register();

      const [payload] = usersService.create.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(payload.role).toBeUndefined();
    });
  });

  // D9 — an admin can deactivate any account; deactivation must mean it
  // cannot get a session back.
  describe('a deactivated account', () => {
    const deactivated = {
      ...baseUser,
      id: 90,
      provider: AuthProvidersEnum.email,
      // bcrypt('right-password'): deactivation is only revealed to someone
      // who already knows the password.
      password: '$2b$04$8m6hXRdZqO.45qF9MPuRx.4OTG5nf.Zp9GDjgrZ00oOVNY3XjZ/RG',
      status: { id: StatusEnum.deactivated },
    };

    it('should not sign in with email and password', async () => {
      usersService.findByEmail.mockResolvedValue(deactivated);

      const error = await service
        .validateLogin({ email: deactivated.email, password: 'right-password' })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.getResponse()).toEqual({
        status: 403,
        code: 'ACCOUNT_DEACTIVATED',
      });
      expect(sessionService.create).not.toHaveBeenCalled();
    });

    // Guard: a wrong password gets the ordinary answer, so the account's
    // state is not disclosed to someone guessing.
    it('should answer a wrong password as for any account', async () => {
      usersService.findByEmail.mockResolvedValue(deactivated);

      await expect(
        service.validateLogin({ email: deactivated.email, password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should not refresh its tokens', async () => {
      sessionService.updateByHash.mockResolvedValue({
        id: 'session-9',
        user: { id: 90 },
      });
      usersService.findById.mockResolvedValue(deactivated);

      await expect(
        service.refreshToken({ sessionId: 'session-9', hash: 'h' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // BE-8 — roles are read from user_role on every request. A role baked into
  // a token outlived a demotion by the token's lifetime (AC-12).
  describe('access token payload', () => {
    const accessPayload = () =>
      (jwtService.signAsync.mock.calls[0] as [Record<string, unknown>])[0];

    it('should carry only the user and session on login', async () => {
      oauthAccountsService.findByProviderAndProviderUid.mockResolvedValue({
        id: 'oauth-1',
        provider: AuthProvidersEnum.google,
        providerUid: 'g-1',
        user: { ...baseUser, id: 5 },
      });

      await service.validateSocialLogin(AuthProvidersEnum.google, {
        id: 'g-1',
      });

      expect(accessPayload()).toEqual({ id: 5, sessionId: 'session-1' });
    });

    it('should carry only the user and session on refresh', async () => {
      sessionService.updateByHash.mockResolvedValue({
        id: 'session-3',
        user: { id: 5 },
      });
      usersService.findById.mockResolvedValue({ ...baseUser, id: 5 });

      await service.refreshToken({ sessionId: 'session-3', hash: 'h' });

      expect(accessPayload()).toEqual({ id: 5, sessionId: 'session-3' });
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
  /**
   * Permission model §2.8 — one algorithm for Facebook and Google.
   *
   * 1. A linked identity signs in as its account, untouched.
   * 2. Otherwise an email the provider vouches for may link to an existing
   *    account — never a privileged one (G3); an unverified one is taken back
   *    from whoever registered it first (G1).
   * 3. Otherwise a new User account is created and linked.
   */
  describe.each([[AuthProvidersEnum.facebook], [AuthProvidersEnum.google]])(
    'social login via %s',
    (provider) => {
      const identity = (overrides: Record<string, unknown> = {}) => ({
        id: `${provider}-uid-1`,
        email: 'student@example.com',
        firstName: 'Jane',
        lastName: 'Student',
        ...overrides,
      });

      const linkTo = (user: unknown) =>
        oauthAccountsService.findByProviderAndProviderUid.mockResolvedValue({
          id: 'oauth-1',
          provider,
          providerUid: `${provider}-uid-1`,
          user,
        });

      const login = (overrides: Record<string, unknown> = {}) =>
        service.validateSocialLogin(provider, identity(overrides));

      describe('an identity linked before', () => {
        it('should sign in as the linked account', async () => {
          const linked = { ...baseUser, id: 9, onboardingDone: true };
          linkTo(linked);

          const result = await login();

          expect(result.user).toBe(linked);
          expect(result.requiresOnboarding).toBe(false);
        });

        it('should look the identity up by this provider and uid', async () => {
          linkTo({ ...baseUser, id: 9 });

          await login();

          expect(
            oauthAccountsService.findByProviderAndProviderUid,
          ).toHaveBeenCalledWith(provider, `${provider}-uid-1`);
        });

        // G4 (AC-32): the address a provider reports can drift to one the
        // user does not control; copying it would route "forgot password"
        // there.
        it('should not create, relink or update anything', async () => {
          linkTo({ ...baseUser, id: 9, email: 'kept@example.com' });

          await login({ email: 'reported@example.com' });

          expect(usersService.create).not.toHaveBeenCalled();
          expect(usersService.update).not.toHaveBeenCalled();
          expect(oauthAccountsService.create).not.toHaveBeenCalled();
          expect(userRolesService.setRole).not.toHaveBeenCalled();
        });

        /*
          A Facebook token without the `email` permission created the account
          with no address at all, and this branch returned the linked user
          untouched — so once the client started asking for the permission,
          onboarding still showed an empty "Địa chỉ email".

          This fills blanks only. The rule above it (G4/AC-32) still stands:
          an address already on the account is never replaced by the one the
          provider reports, because that can drift to a mailbox the learner
          does not control and would then receive password resets.
        */
        it('should backfill the email of a linked account that has none', async () => {
          linkTo({ ...baseUser, id: 9, email: null, emailVerified: false });
          usersService.findByEmail.mockResolvedValue(null);

          const result = await login({ email: 'Reported@Example.com' });

          expect(usersService.update).toHaveBeenCalledWith(
            9,
            expect.objectContaining({ email: 'reported@example.com' }),
          );
          // Carried on this very request, not only on the next sign-in.
          expect(result.user.email).toBe('reported@example.com');
        });

        it('should mark a backfilled email as verified', async () => {
          linkTo({ ...baseUser, id: 9, email: null, emailVerified: false });
          usersService.findByEmail.mockResolvedValue(null);

          const result = await login({ email: 'reported@example.com' });

          expect(usersService.update).toHaveBeenCalledWith(
            9,
            expect.objectContaining({ emailVerified: true }),
          );
          expect(result.user.emailVerified).toBe(true);
        });

        it('should not overwrite an email the account already has', async () => {
          linkTo({ ...baseUser, id: 9, email: 'kept@example.com' });

          const result = await login({ email: 'reported@example.com' });

          expect(usersService.update).not.toHaveBeenCalled();
          expect(result.user.email).toBe('kept@example.com');
        });

        /*
          Signing in must not move an address between accounts. Merging two
          accounts is a deliberate decision with its own rules, not something
          that happens because somebody pressed "Continue with Facebook".
        */
        it('should not take an email that belongs to another account', async () => {
          linkTo({ ...baseUser, id: 9, email: null, emailVerified: false });
          usersService.findByEmail.mockResolvedValue({ id: 77 });

          const result = await login({ email: 'taken@example.com' });

          expect(usersService.update).not.toHaveBeenCalled();
          expect(result.user.email).toBeNull();
        });

        it('should sign in normally when Facebook still returns no email', async () => {
          linkTo({ ...baseUser, id: 9, email: null, emailVerified: false });

          const result = await login({ email: undefined });

          expect(usersService.update).not.toHaveBeenCalled();
          expect(usersService.findByEmail).not.toHaveBeenCalled();
          expect(result.user.id).toBe(9);
        });

        it('should keep the address it already has when the provider sends none', async () => {
          linkTo({ ...baseUser, id: 9, email: 'kept@example.com' });

          const result = await login({ email: undefined });

          expect(result.user.email).toBe('kept@example.com');
          expect(usersService.update).not.toHaveBeenCalled();
        });

        // The admin rule is about creating a link, not using one: staff who
        // linked a provider from their profile keep signing in with it.
        it('should sign in an admin through an existing link', async () => {
          const admin = { ...baseUser, id: 44 };
          grantAdminPermission(admin.id);
          linkTo(admin);

          const result = await login();

          expect(result.user).toBe(admin);
        });

        it('should refuse a deactivated account', async () => {
          linkTo({
            ...baseUser,
            id: 9,
            status: { id: StatusEnum.deactivated },
          });

          const error = await login().catch((e) => e);

          expect(error).toBeInstanceOf(ForbiddenException);
          expect(error.getResponse()).toEqual({
            status: 403,
            code: 'ACCOUNT_DEACTIVATED',
          });
          expect(sessionService.create).not.toHaveBeenCalled();
        });

        // A link whose account was deleted must not resurrect it.
        it('should refuse a link whose account no longer exists', async () => {
          linkTo(null);

          await expect(login()).rejects.toBeInstanceOf(
            UnprocessableEntityException,
          );
          expect(sessionService.create).not.toHaveBeenCalled();
        });
      });

      describe('an unlinked identity whose email matches an account', () => {
        beforeEach(() => {
          oauthAccountsService.findByProviderAndProviderUid.mockResolvedValue(
            null,
          );
        });

        // AC-27
        it('should sign in as the existing account and save the link', async () => {
          const existing = { ...baseUser, id: 42 };
          usersService.findByEmail.mockResolvedValue(existing);

          const result = await login({ email: 'Student@Example.com' });

          expect(usersService.findByEmail).toHaveBeenCalledWith(
            'student@example.com',
          );
          expect(oauthAccountsService.create).toHaveBeenCalledWith({
            provider,
            providerUid: `${provider}-uid-1`,
            user: existing,
          });
          expect(result.user).toBe(existing);
          expect(usersService.create).not.toHaveBeenCalled();
        });

        it('should keep the existing account’s role', async () => {
          usersService.findByEmail.mockResolvedValue({ ...baseUser, id: 42 });

          await login();

          expect(userRolesService.setRole).not.toHaveBeenCalled();
        });

        // G1 (AC-28) — pre-account hijacking: someone registers the victim's
        // address with a password and never verifies it. When the real owner
        // signs in with a provider that vouches for the address, the
        // squatter's password and sessions must not survive the link.
        it('should strip the password and sessions of an unverified account before linking', async () => {
          const squatted = {
            ...baseUser,
            id: 41,
            emailVerified: false,
            status: { id: StatusEnum.inactive },
          };
          usersService.findByEmail.mockResolvedValue(squatted);

          await login();

          expect(usersService.clearPassword).toHaveBeenCalledWith(41);
          expect(sessionService.deleteByUserId).toHaveBeenCalledWith({
            userId: 41,
          });
          expect(usersService.update).toHaveBeenCalledWith(
            41,
            expect.objectContaining({
              emailVerified: true,
              status: { id: StatusEnum.active },
            }),
          );
          expect(
            sessionService.deleteByUserId.mock.invocationCallOrder[0],
          ).toBeLessThan(sessionService.create.mock.invocationCallOrder[0]);
        });

        it('should leave a verified account’s password and sessions alone', async () => {
          usersService.findByEmail.mockResolvedValue({ ...baseUser, id: 42 });

          await login();

          expect(usersService.clearPassword).not.toHaveBeenCalled();
          expect(sessionService.deleteByUserId).not.toHaveBeenCalled();
        });

        // G3 (AC-30) — an admin session is the most valuable thing a
        // look-alike or compromised social account could become.
        it('should refuse to auto-link an account holding any admin-panel permission', async () => {
          const admin = { ...baseUser, id: 43 };
          usersService.findByEmail.mockResolvedValue(admin);
          grantAdminPermission(admin.id);

          const error = await login().catch((e) => e);

          expect(error).toBeInstanceOf(ConflictException);
          expect(error.getResponse()).toEqual({
            status: 409,
            error: 'social_link_requires_password',
          });
          expect(oauthAccountsService.create).not.toHaveBeenCalled();
          expect(sessionService.create).not.toHaveBeenCalled();
          expect(usersService.clearPassword).not.toHaveBeenCalled();
        });

        it('should refuse to link a deactivated account', async () => {
          usersService.findByEmail.mockResolvedValue({
            ...baseUser,
            id: 46,
            status: { id: StatusEnum.deactivated },
          });

          await expect(login()).rejects.toBeInstanceOf(ForbiddenException);
          expect(oauthAccountsService.create).not.toHaveBeenCalled();
        });
      });

      describe('an identity matching nothing', () => {
        beforeEach(() => {
          oauthAccountsService.findByProviderAndProviderUid.mockResolvedValue(
            null,
          );
          usersService.findByEmail.mockResolvedValue(null);
          usersService.create.mockResolvedValue({ ...baseUser, id: 77 });
        });

        // AC-26
        it('should create an account and link the identity to it', async () => {
          const result = await login();

          expect(usersService.create).toHaveBeenCalledWith(
            expect.objectContaining({
              email: 'student@example.com',
              fullName: 'Jane Student',
              emailVerified: true,
              onboardingDone: false,
              provider,
              status: { id: StatusEnum.active },
            }),
          );
          expect(oauthAccountsService.create).toHaveBeenCalledWith({
            provider,
            providerUid: `${provider}-uid-1`,
            user: expect.objectContaining({ id: 77 }),
          });
          expect(result.requiresOnboarding).toBe(true);
        });

        it('should give the new account the User role', async () => {
          await login();

          expect(userRolesService.setRole).toHaveBeenCalledWith(
            77,
            RoleEnum.user,
            null,
          );
        });

        // Social identity lives in oauth_account now; user.social_id is no
        // longer written or read.
        it('should not write the legacy social id column', async () => {
          await login();

          const [payload] = usersService.create.mock.calls[0] as [
            Record<string, unknown>,
          ];
          expect(payload.socialId).toBeUndefined();
        });

        // G2 — with no address, nothing can be matched or vouched for.
        it('should create an unverified, email-less account when the provider gives no email', async () => {
          await login({ email: undefined });

          expect(usersService.findByEmail).not.toHaveBeenCalled();
          expect(usersService.create).toHaveBeenCalledWith(
            expect.objectContaining({ email: null, emailVerified: false }),
          );
        });
      });

      // TypeORM drops an undefined property from `where`, so a missing uid
      // would match whichever linked account comes first.
      it('should reject an identity without a provider uid before any lookup', async () => {
        await expect(login({ id: '' })).rejects.toBeInstanceOf(
          UnprocessableEntityException,
        );

        expect(
          oauthAccountsService.findByProviderAndProviderUid,
        ).not.toHaveBeenCalled();
        expect(usersService.findByEmail).not.toHaveBeenCalled();
        expect(sessionService.create).not.toHaveBeenCalled();
      });
    },
  );
});
