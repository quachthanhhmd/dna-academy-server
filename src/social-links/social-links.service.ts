import {
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { OauthAccountsService } from '../oauth-accounts/oauth-accounts.service';
import { AuthFacebookService } from '../auth-facebook/auth-facebook.service';
import { AuthGoogleService } from '../auth-google/auth-google.service';
import { SocialInterface } from '../social/interfaces/social.interface';

export type SocialProvider = 'facebook' | 'google';

export type SocialLinkDto = { provider: string; linkedAt: Date };

/**
 * Permission model §1.4 — a signed-in user's linked providers (G6: the only
 * place besides login that writes `oauth_account`).
 *
 * Linking needs the account password when the account has one. A link
 * outlives the session that made it — and every later password change — so
 * a stolen access token must not be enough to attach the thief's provider.
 */
@Injectable()
export class SocialLinksService {
  private readonly logger = new Logger(SocialLinksService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly oauthAccountsService: OauthAccountsService,
    private readonly facebook: AuthFacebookService,
    private readonly google: AuthGoogleService,
  ) {}

  async list(
    userId: number,
  ): Promise<{ links: SocialLinkDto[]; hasPassword: boolean }> {
    const [user, links] = await Promise.all([
      this.usersService.findById(userId),
      this.oauthAccountsService.findByUserId(userId),
    ]);

    return {
      links: links.map((link) => ({
        provider: link.provider,
        linkedAt: link.createdAt,
      })),
      hasPassword: Boolean(user?.password),
    };
  }

  async link(
    userId: number,
    provider: SocialProvider,
    input: { token: string; password?: string },
  ): Promise<SocialLinkDto> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'userNotFound',
      });
    }

    await this.assertPassword(user.password, input.password);

    const identity = await this.verify(provider, input.token);

    if (!identity.id) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { token: 'wrongToken' },
      });
    }

    const existing =
      await this.oauthAccountsService.findByProviderAndProviderUid(
        provider,
        identity.id,
      );

    if (existing && existing.user?.id !== userId) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        error: 'social_identity_in_use',
      });
    }

    const own = await this.oauthAccountsService.findByUserId(userId);

    if (existing || own.some((link) => link.provider === provider)) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        error: 'provider_already_linked',
      });
    }

    const created = await this.oauthAccountsService.create({
      provider,
      providerUid: identity.id,
      user: { id: userId },
    });

    this.logger.log(`User ${userId} linked ${provider}`);

    return { provider, linkedAt: created.createdAt };
  }

  async unlink(userId: number, provider: string): Promise<void> {
    const [user, links] = await Promise.all([
      this.usersService.findById(userId),
      this.oauthAccountsService.findByUserId(userId),
    ]);
    const link = links.find((l) => l.provider === provider);

    if (!link) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'linkNotFound',
      });
    }

    if (!user?.password && links.length === 1) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        error: 'last_login_method',
      });
    }

    await this.oauthAccountsService.remove(link.id);

    this.logger.log(`User ${userId} unlinked ${provider}`);
  }

  private async assertPassword(
    stored: string | null | undefined,
    given: string | undefined,
  ): Promise<void> {
    if (!stored) {
      return;
    }

    if (!given) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { password: 'required' },
      });
    }

    if (!(await bcrypt.compare(given, stored))) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { password: 'incorrectPassword' },
      });
    }
  }

  private verify(
    provider: SocialProvider,
    token: string,
  ): Promise<SocialInterface> {
    return provider === 'facebook'
      ? this.facebook.getProfileByToken({ accessToken: token })
      : this.google.getProfileByToken({ idToken: token });
  }
}
