import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import ms from 'ms';
import crypto from 'crypto';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { AuthProvidersEnum } from './auth-providers.enum';
import { SocialInterface } from '../social/interfaces/social.interface';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { NullableType } from '../utils/types/nullable.type';
import { LoginResponseDto } from './dto/login-response.dto';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshPayloadType } from './strategies/types/jwt-refresh-payload.type';
import { JwtPayloadType } from './strategies/types/jwt-payload.type';
import { UsersService } from '../users/users.service';
import { AllConfigType } from '../config/config.type';
import { MailService } from '../mail/mail.service';
import { RoleEnum } from '../roles/roles.enum';
import { Session } from '../session/domain/session';
import { SessionService } from '../session/session.service';
import { StatusEnum } from '../statuses/statuses.enum';
import { User } from '../users/domain/user';
import { OauthAccountsService } from '../oauth-accounts/oauth-accounts.service';
import { StudentProfilesService } from '../student-profiles/student-profiles.service';
import { StudentCareerInterestsService } from '../student-career-interests/student-career-interests.service';
import { AuthOnboardingDto } from './dto/auth-onboarding.dto';
import { OnboardingService } from './onboarding.service';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UserRolesService } from '../user-roles/user-roles.service';
import { RolePermissionsService } from '../role-permissions/role-permissions.service';
import { LoginFailureLimiter } from './login-failure-limiter';

/** Permission model O1 — how long an instructor invite stays usable. */
export const INVITE_EXPIRES_IN = '72h';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly loginFailures = new LoginFailureLimiter();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly oauthAccountsService: OauthAccountsService,
    private readonly studentProfilesService: StudentProfilesService,
    private readonly studentCareerInterestsService: StudentCareerInterestsService,
    private readonly userRolesService: UserRolesService,
    private readonly rolePermissionsService: RolePermissionsService,
    private readonly onboardingService: OnboardingService,
  ) {}

  async validateLogin(loginDto: AuthEmailLoginDto): Promise<LoginResponseDto> {
    this.loginFailures.assertAllowed(loginDto.email);

    try {
      const response = await this.checkEmailLogin(loginDto);
      this.loginFailures.clear(loginDto.email);
      return response;
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        this.loginFailures.recordFailure(loginDto.email);
      }
      throw error;
    }
  }

  private async checkEmailLogin(
    loginDto: AuthEmailLoginDto,
  ): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: 'notFound',
        },
      });
    }

    if (user.provider !== AuthProvidersEnum.email) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: `needLoginViaProvider:${user.provider}`,
        },
      });
    }

    if (!user.password) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          password: 'incorrectPassword',
        },
      });
    }

    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isValidPassword) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          password: 'incorrectPassword',
        },
      });
    }

    return this.buildLoginResponse(user);
  }

  /**
   * D9 — a deactivated account gets no new session, by any login method.
   * Called only once the caller has proved who they are, so the account's
   * state is not disclosed to someone guessing.
   */
  private assertCanSignIn(user: User): void {
    if (user.status?.id?.toString() === StatusEnum.deactivated.toString()) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        code: 'ACCOUNT_DEACTIVATED',
      });
    }
  }

  private async buildLoginResponse(user: User): Promise<LoginResponseDto> {
    this.assertCanSignIn(user);

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionService.create({
      user,
      hash,
    });

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: user.id,
      sessionId: session.id,
      hash,
    });

    return {
      refreshToken,
      token,
      tokenExpires,
      user,
      requiresOnboarding: !user.onboardingDone,
    };
  }

  /**
   * Permission model §2.8 — Facebook and Google sign in through one path.
   *
   * 1. A linked identity signs in as its account, which is left untouched
   *    (G4: the address a provider reports can drift to one the user does not
   *    control).
   * 2. Otherwise an email the provider vouches for (G2) links to the account
   *    holding it — unless that account holds any admin-panel permission
   *    (G3), and after taking an unverified account back from whoever
   *    registered it (G1).
   * 3. Otherwise a new User account is created.
   *
   * Links are only ever written here and by `/auth/me/social-links` (G6), and
   * `(provider, provider_uid)` is unique (G5).
   */
  async validateSocialLogin(
    provider: AuthProvidersEnum,
    socialData: SocialInterface,
  ): Promise<LoginResponseDto> {
    // TypeORM ignores an undefined property in `where`, so a missing uid would
    // widen the lookup to every account linked to this provider.
    if (!socialData.id) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          user: 'wrongToken',
        },
      });
    }

    const link = await this.oauthAccountsService.findByProviderAndProviderUid(
      provider,
      socialData.id,
    );

    if (link) {
      // A link outliving its account (deleted since) must not resurrect it.
      if (!link.user) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            user: 'userNotFound',
          },
        });
      }

      return this.buildLoginResponse(
        await this.backfillFromSocial(link.user, socialData),
      );
    }

    const socialEmail = socialData.email?.toLowerCase();
    const existing = socialEmail
      ? await this.usersService.findByEmail(socialEmail)
      : null;

    let user: User;

    if (existing) {
      this.assertCanSignIn(existing);
      user = await this.prepareLinkByEmail(existing);
    } else {
      user = await this.usersService.create({
        email: socialEmail ?? null,
        firstName: socialData.firstName ?? null,
        lastName: socialData.lastName ?? null,
        fullName:
          [socialData.firstName, socialData.lastName]
            .filter(Boolean)
            .join(' ') ||
          (socialEmail ?? ''),
        profilePictureUrl: socialData.picture ?? null,
        // Only an address the provider vouched for reaches this point.
        emailVerified: Boolean(socialEmail),
        onboardingDone: false,
        provider,
        status: {
          id: StatusEnum.active,
        },
      });

      await this.userRolesService.setRole(user.id, RoleEnum.user, null);
    }

    await this.oauthAccountsService.create({
      provider,
      providerUid: socialData.id,
      user,
    });

    return this.buildLoginResponse(user);
  }

  async register(dto: AuthRegisterLoginDto): Promise<void> {
    const user = await this.usersService.create({
      ...dto,
      email: dto.email,
      fullName: `${dto.firstName} ${dto.lastName}`,
      emailVerified: false,
      onboardingDone: false,
      status: {
        id: StatusEnum.inactive,
      },
    });

    await this.userRolesService.setRole(user.id, RoleEnum.user, null);

    await this.studentProfilesService.create({
      user: { id: user.id },
      educationStageCode: null,
    });

    await this.sendSignUpConfirmationEmail(user.id, dto.email);
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: 'emailNotExists',
        },
      });
    }

    if (user.status?.id?.toString() !== StatusEnum.inactive.toString()) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: 'emailAlreadyConfirmed',
        },
      });
    }

    await this.sendSignUpConfirmationEmail(user.id, email);
  }

  private async sendSignUpConfirmationEmail(
    userId: User['id'],
    email: string,
  ): Promise<void> {
    const hash = await this.jwtService.signAsync(
      {
        confirmEmailUserId: userId,
      },
      {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
          infer: true,
        }),
      },
    );

    await this.mailService.userSignUp({
      to: email,
      data: {
        hash,
      },
    });
  }

  async confirmEmail(hash: string): Promise<void> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });

      userId = jwtData.confirmEmailUserId;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `invalidHash`,
        },
      });
    }

    const user = await this.usersService.findById(userId);

    if (
      !user ||
      user?.status?.id?.toString() !== StatusEnum.inactive.toString()
    ) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `notFound`,
      });
    }

    await this.usersService.update(user.id, {
      status: { id: StatusEnum.active },
      emailVerified: true,
    });
  }

  async confirmNewEmail(hash: string): Promise<void> {
    let userId: User['id'];
    let newEmail: User['email'];
    let currentEmail: User['email'] | undefined;

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
        newEmail: User['email'];
        currentEmail?: User['email'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });

      userId = jwtData.confirmEmailUserId;
      newEmail = jwtData.newEmail;
      // Absent — not null — on sign-up confirmation tokens, which share this
      // secret and would otherwise verify here.
      currentEmail = Object.prototype.hasOwnProperty.call(
        jwtData,
        'currentEmail',
      )
        ? jwtData.currentEmail
        : undefined;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `invalidHash`,
        },
      });
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `notFound`,
      });
    }

    // Valid only while the account still has the email it had when the link
    // was issued. Confirming this link, or any later one, changes that — so an
    // old link cannot move the account back to an address that may be a typo
    // or an abandoned inbox, where "forgot password" would take it over.
    if (
      !newEmail ||
      currentEmail === undefined ||
      (user.email ?? null) !== currentEmail
    ) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `invalidHash`,
        },
      });
    }

    await this.usersService.update(user.id, {
      email: newEmail,
      status: { id: StatusEnum.active },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: 'emailNotExists',
        },
      });
    }

    const tokenExpiresIn = this.configService.getOrThrow('auth.forgotExpires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const hash = await this.jwtService.signAsync(
      {
        forgotUserId: user.id,
        pwd: this.passwordFingerprint(user.password),
      },
      {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
        expiresIn: tokenExpiresIn,
      },
    );

    await this.mailService.forgotPassword({
      to: email,
      data: {
        hash,
        tokenExpires,
      },
    });
  }

  async resetPassword(hash: string, password: string): Promise<void> {
    let userId: User['id'];
    let issuedForPassword: string | undefined;

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        forgotUserId: User['id'];
        pwd?: string;
      }>(hash, {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
      });

      userId = jwtData.forgotUserId;
      issuedForPassword = jwtData.pwd;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `invalidHash`,
        },
      });
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `notFound`,
        },
      });
    }

    // The link is bound to the password the account had when it was issued.
    // Once that changes — through this link or any other way — it stops
    // working, instead of staying replayable until it expires.
    if (
      !issuedForPassword ||
      !this.fingerprintsMatch(
        issuedForPassword,
        this.passwordFingerprint(user.password),
      )
    ) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `invalidHash`,
        },
      });
    }

    await this.sessionService.deleteByUserId({
      userId: user.id,
    });

    // §1.5 — the link was sent to the account's address, so following it
    // proves the address. A deactivated account stays deactivated (D9).
    await this.usersService.update(user.id, {
      password,
      emailVerified: true,
      ...(user.status?.id?.toString() === StatusEnum.inactive.toString()
        ? { status: { id: StatusEnum.active } }
        : {}),
    });
  }

  /**
   * Permission model §2.9 — the invite for an account created without a
   * password: a reset link bound to the account's current (empty) password,
   * so it works once, living {@link INVITE_EXPIRES_IN} (O1).
   */
  async sendPasswordInvite(
    user: Pick<User, 'id' | 'email' | 'password'>,
  ): Promise<void> {
    if (!user.email) {
      return;
    }

    const hash = await this.jwtService.signAsync(
      {
        forgotUserId: user.id,
        pwd: this.passwordFingerprint(user.password),
      },
      {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
        expiresIn: INVITE_EXPIRES_IN,
      },
    );

    await this.mailService.instructorInvite({
      to: user.email,
      data: {
        hash,
        tokenExpires: Date.now() + ms(INVITE_EXPIRES_IN),
      },
    });
  }

  async me(userJwtPayload: JwtPayloadType): Promise<NullableType<User>> {
    return this.usersService.findById(userJwtPayload.id);
  }

  async update(
    userJwtPayload: JwtPayloadType,
    userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    const currentUser = await this.usersService.findById(userJwtPayload.id);

    if (!currentUser) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          user: 'userNotFound',
        },
      });
    }

    if (userDto.password) {
      if (!userDto.oldPassword) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            oldPassword: 'missingOldPassword',
          },
        });
      }

      if (!currentUser.password) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            oldPassword: 'incorrectOldPassword',
          },
        });
      }

      const isValidOldPassword = await bcrypt.compare(
        userDto.oldPassword,
        currentUser.password,
      );

      if (!isValidOldPassword) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            oldPassword: 'incorrectOldPassword',
          },
        });
      } else {
        await this.sessionService.deleteByUserIdWithExclude({
          userId: currentUser.id,
          excludeSessionId: userJwtPayload.sessionId,
        });
      }
    }

    if (userDto.email && userDto.email !== currentUser.email) {
      const userByEmail = await this.usersService.findByEmail(userDto.email);

      if (userByEmail && userByEmail.id !== currentUser.id) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailExists',
          },
        });
      }

      const hash = await this.jwtService.signAsync(
        {
          confirmEmailUserId: currentUser.id,
          newEmail: userDto.email,
          // Binds the link to the address it moves away from; see confirmNewEmail.
          currentEmail: currentUser.email ?? null,
        },
        {
          secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
            infer: true,
          }),
        },
      );

      await this.mailService.confirmNewEmail({
        to: userDto.email,
        data: {
          hash,
        },
      });
    }

    delete userDto.email;
    delete userDto.oldPassword;

    await this.usersService.update(userJwtPayload.id, userDto);

    return this.usersService.findById(userJwtPayload.id);
  }

  async refreshToken(
    data: Pick<JwtRefreshPayloadType, 'sessionId' | 'hash'>,
  ): Promise<Omit<LoginResponseDto, 'user'>> {
    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionService.updateByHash(
      { id: data.sessionId, hash: data.hash },
      { hash },
    );

    if (!session) {
      // The session exists but this hash is no longer its current one: the
      // refresh token was already rotated, so two parties hold a copy. There is
      // no telling which is the thief, so the session ends for both — the real
      // user signs in again and the copy becomes worthless.
      const replayed = await this.sessionService.findById(data.sessionId);

      if (replayed) {
        await this.sessionService.deleteById(replayed.id);
      }

      throw new UnauthorizedException();
    }

    const user = await this.usersService.findById(session.user.id);

    if (
      !user ||
      user.status?.id?.toString() === StatusEnum.deactivated.toString()
    ) {
      throw new UnauthorizedException();
    }

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: session.user.id,
      sessionId: session.id,
      hash,
    });

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }

  async softDelete(user: User): Promise<void> {
    await this.usersService.remove(user.id);
  }

  async logout(data: Pick<JwtRefreshPayloadType, 'sessionId'>) {
    return this.sessionService.deleteById(data.sessionId);
  }

  /**
   * Epic 6 UC-I18N-05 — persist the caller's preferred UI locale. The value is
   * validated by the DTO against the supported set, so an unknown locale never
   * reaches the column.
   */
  async updateLocale(
    userId: User['id'],
    locale: string,
  ): Promise<ProfileResponseDto> {
    await this.usersService.update(userId, { locale });

    return this.getProfile(userId);
  }

  async getProfile(userId: User['id']): Promise<ProfileResponseDto> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `notFound`,
      });
    }

    const [studentProfile, careerInterests] = await Promise.all([
      this.studentProfilesService.findByUserId(userId),
      this.studentCareerInterestsService.findByUserId(userId),
    ]);

    return {
      user,
      studentProfile,
      careerInterests,
    };
  }

  async completeOnboarding(
    userId: User['id'],
    dto: AuthOnboardingDto,
  ): Promise<ProfileResponseDto> {
    await this.onboardingService.complete(userId, dto);

    return this.getProfile(userId);
  }

  /**
   * Runs before a social identity is attached to an account found by email,
   * and returns the account as it stands afterwards.
   *
   * Both rules exist because matching on email hands the account to whoever
   * the provider says owns that address:
   *
   * - **Accounts holding any admin-panel permission are never auto-linked.**
   *   A look-alike or compromised social account would otherwise become an
   *   admin session. Staff link a provider from their profile instead, after
   *   signing in with their password.
   * - **An unverified account loses its password and sessions.** Login does
   *   not require verification, so someone can register another person's
   *   address, set a password and keep using the account. Once the real owner
   *   arrives through a provider that vouches for the address, the squatter's
   *   way in has to go.
   */
  /**
   * Fills in the email a linked account never received.
   *
   * A Facebook token without the `email` permission produced an account with
   * `email: null`, and this branch returned the linked user untouched — so
   * once the client started asking for the permission, the address still
   * never arrived and onboarding kept showing an empty email field.
   *
   * **Blanks only.** An address already on the account is never overwritten
   * and never cleared: the provider is a source for what is missing, not an
   * authority over what the account already says. Names and the avatar are
   * deliberately left alone — the learner may have edited them, and a
   * sign-in is not the moment to reconsider that.
   */
  private async backfillFromSocial(
    user: User,
    socialData: SocialInterface,
  ): Promise<User> {
    const email = socialData.email?.trim().toLowerCase();

    if (!email || user.email) {
      return user;
    }

    if (!(await this.canClaimEmail(user, email))) {
      return user;
    }

    // Verified because the provider vouched for it — the same rule account
    // creation uses.
    const patch = { email, emailVerified: true };

    await this.usersService.update(user.id, patch);

    // Merged into the returned user rather than re-read, so the login
    // response and /auth/me carry the address on this very request.
    return { ...user, ...patch };
  }

  /**
   * Whether this account may take the address the provider reported.
   *
   * If another account already owns it, the two are left exactly as they
   * are: signing in must not quietly move an address between accounts, and
   * merging them is a deliberate decision with its own rules — not a side
   * effect of somebody pressing "Continue with Facebook".
   */
  private async canClaimEmail(user: User, email: string): Promise<boolean> {
    const owner = await this.usersService.findByEmail(email);

    if (!owner || owner.id === user.id) {
      return true;
    }

    this.logger.warn(
      `Social sign-in for user ${user.id} reported ${email}, which already ` +
        `belongs to user ${owner.id}; leaving both accounts unchanged.`,
    );

    return false;
  }

  private async prepareLinkByEmail(user: User): Promise<User> {
    if (await this.holdsAnyPermission(user.id)) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        error: 'social_link_requires_password',
      });
    }

    if (user.emailVerified) {
      return user;
    }

    await this.usersService.clearPassword(user.id);
    await this.sessionService.deleteByUserId({ userId: user.id });
    await this.usersService.update(user.id, {
      emailVerified: true,
      status: { id: StatusEnum.active },
    });

    return {
      ...user,
      password: null,
      emailVerified: true,
      status: { id: StatusEnum.active },
    };
  }

  /** Whether any of the user's roles grants at least one permission. */
  private async holdsAnyPermission(userId: User['id']): Promise<boolean> {
    const userRoles = await this.userRolesService.findByUserId(userId);

    for (const userRole of userRoles) {
      const granted = await this.rolePermissionsService.findByRoleId(
        userRole.role.id,
      );

      if (granted.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * A keyed digest of the stored password hash, carried inside reset links.
   *
   * Keyed with the reset-link secret rather than a plain SHA so the token —
   * which is only base64, readable by anyone holding the link — reveals
   * nothing that helps an offline attack on the stored hash.
   */
  private passwordFingerprint(password: User['password'] | undefined): string {
    return crypto
      .createHmac(
        'sha256',
        this.configService.getOrThrow('auth.forgotSecret', { infer: true }),
      )
      .update(password ?? '')
      .digest('base64url');
  }

  private fingerprintsMatch(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);

    return left.length === right.length && crypto.timingSafeEqual(left, right);
  }

  /**
   * The access token names the user and the session, nothing else. Roles and
   * permissions are read from the database on each request, so a demotion
   * takes effect on the next one (permission model §2.5).
   */
  private async getTokensData(data: {
    id: User['id'];
    sessionId: Session['id'];
    hash: Session['hash'];
  }) {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const [token, refreshToken] = await Promise.all([
      await this.jwtService.signAsync(
        {
          id: data.id,
          sessionId: data.sessionId,
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: tokenExpiresIn,
        },
      ),
      await this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
            infer: true,
          }),
        },
      ),
    ]);

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }
}
