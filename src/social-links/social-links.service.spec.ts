import { describe, expect, it, beforeAll, beforeEach } from '@jest/globals';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { SocialLinksService } from './social-links.service';

/**
 * Permission model §1.4 — linking a provider from the profile. It is how an
 * account G3 refused to auto-link gets a provider, and how someone whose
 * provider gave no email joins it to their existing account.
 */
describe('SocialLinksService', () => {
  const PASSWORD = 'account-password';
  let passwordHash: string;
  let users: Map<number, { id: number; password: string | null }>;
  let links: Array<{
    id: string;
    provider: string;
    providerUid: string;
    user: { id: number };
    createdAt: Date;
  }>;
  let profiles: Record<string, { id?: string }>;
  let service: SocialLinksService;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });

  beforeEach(() => {
    users = new Map([
      [1, { id: 1, password: passwordHash }],
      [2, { id: 2, password: null }],
      [3, { id: 3, password: passwordHash }],
    ]);
    links = [
      {
        id: 'l-other',
        provider: 'google',
        providerUid: 'g-taken',
        user: { id: 3 },
        createdAt: new Date('2026-09-01T00:00:00Z'),
      },
    ];
    profiles = {
      'fb-token': { id: 'fb-1' },
      'g-token': { id: 'g-1' },
      'g-taken-token': { id: 'g-taken' },
      'no-uid': {},
    };

    service = new SocialLinksService(
      {
        findById: (id: number) => Promise.resolve(users.get(id) ?? null),
      } as never,
      {
        findByUserId: (userId: number) =>
          Promise.resolve(links.filter((l) => l.user.id === userId)),
        findByProviderAndProviderUid: (provider: string, uid: string) =>
          Promise.resolve(
            links.find(
              (l) => l.provider === provider && l.providerUid === uid,
            ) ?? null,
          ),
        create: (data: {
          provider: string;
          providerUid: string;
          user: { id: number };
        }) => {
          const link = {
            id: `l-${links.length}`,
            ...data,
            createdAt: new Date('2026-09-17T10:00:00Z'),
          };
          links.push(link);
          return Promise.resolve(link);
        },
        remove: (id: string) => {
          links = links.filter((l) => l.id !== id);
          return Promise.resolve();
        },
      } as never,
      {
        getProfileByToken: ({ accessToken }: { accessToken: string }) =>
          Promise.resolve(profiles[accessToken]),
      } as never,
      {
        getProfileByToken: ({ idToken }: { idToken: string }) =>
          Promise.resolve(profiles[idToken]),
      } as never,
    );
  });

  const failure = (promise: Promise<unknown>) =>
    promise.then(
      () => {
        throw new Error('expected a rejection');
      },
      (error) => error,
    );

  describe('list', () => {
    it('should list the links and whether the account has a password', async () => {
      expect(await service.list(3)).toEqual({
        links: [
          { provider: 'google', linkedAt: new Date('2026-09-01T00:00:00Z') },
        ],
        hasPassword: true,
      });
    });
  });

  describe('link', () => {
    it('should link a provider identity to the account', async () => {
      const result = await service.link(1, 'facebook', {
        token: 'fb-token',
        password: PASSWORD,
      });

      expect(result).toEqual({
        provider: 'facebook',
        linkedAt: new Date('2026-09-17T10:00:00Z'),
      });
      expect(links).toContainEqual(
        expect.objectContaining({
          provider: 'facebook',
          providerUid: 'fb-1',
          user: { id: 1 },
        }),
      );
    });

    // A stolen access token alone must not be enough to attach the thief's
    // own Facebook — that would outlive the token and every password change.
    it('should require the account password when the account has one', async () => {
      const error = await failure(
        service.link(1, 'facebook', { token: 'fb-token' }),
      );

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(error.getResponse()).toEqual({
        status: 422,
        errors: { password: 'required' },
      });
      expect(links).toHaveLength(1);
    });

    it('should refuse a wrong password', async () => {
      const error = await failure(
        service.link(1, 'facebook', { token: 'fb-token', password: 'wrong' }),
      );

      expect(error.getResponse()).toEqual({
        status: 422,
        errors: { password: 'incorrectPassword' },
      });
    });

    it('should not ask for a password an account does not have', async () => {
      await service.link(2, 'google', { token: 'g-token' });

      expect(links.some((l) => l.user.id === 2)).toBe(true);
    });

    it('should refuse an identity already linked to another account', async () => {
      const error = await failure(
        service.link(1, 'google', {
          token: 'g-taken-token',
          password: PASSWORD,
        }),
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toEqual({
        status: 409,
        error: 'social_identity_in_use',
      });
    });

    it('should refuse a second link for the same provider', async () => {
      const error = await failure(
        service.link(3, 'google', { token: 'g-token', password: PASSWORD }),
      );

      expect(error.getResponse()).toEqual({
        status: 409,
        error: 'provider_already_linked',
      });
    });

    it('should refuse a provider profile without a uid', async () => {
      await expect(
        service.link(2, 'facebook', { token: 'no-uid' }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('unlink', () => {
    it('should remove the link', async () => {
      await service.unlink(3, 'google');

      expect(links).toEqual([]);
    });

    it('should 404 when there is no such link', async () => {
      expect(await failure(service.unlink(1, 'facebook'))).toBeInstanceOf(
        NotFoundException,
      );
    });

    // Without a password or another link the account could never sign in.
    it('should refuse to remove the last way to sign in', async () => {
      links.push({
        id: 'l-only',
        provider: 'facebook',
        providerUid: 'fb-only',
        user: { id: 2 },
        createdAt: new Date(),
      });

      const error = await failure(service.unlink(2, 'facebook'));

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toEqual({
        status: 409,
        error: 'last_login_method',
      });
    });

    it('should allow removing one of two links from a password-less account', async () => {
      links.push(
        {
          id: 'l-a',
          provider: 'facebook',
          providerUid: 'fb-a',
          user: { id: 2 },
          createdAt: new Date(),
        },
        {
          id: 'l-b',
          provider: 'google',
          providerUid: 'g-b',
          user: { id: 2 },
          createdAt: new Date(),
        },
      );

      await service.unlink(2, 'facebook');

      expect(links.filter((l) => l.user.id === 2)).toHaveLength(1);
    });
  });
});
