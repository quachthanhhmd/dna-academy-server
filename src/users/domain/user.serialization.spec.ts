import { describe, expect, it } from '@jest/globals';
import { instanceToPlain } from 'class-transformer';
import { User } from './user';

/*
  What keeps a user's email, sign-in provider and social id out of a response
  is a pair of class-transformer decorators plus a @SerializeOptions group on
  the handful of endpoints allowed to see them. That is invisible machinery: if
  someone drops an @Expose, or puts groups: ['me'] on a public endpoint,
  nothing else in the suite notices. These are the tests that notice.

  The direction matters as much as the fields. A property carrying
  @Expose({ groups }) is hidden when the groups do not match, so an endpoint
  that forgets @SerializeOptions leaks nothing — it under-shares. Keep it that
  way: never relax a field to no group as a fix for a response missing data.
*/
const user = (): User =>
  Object.assign(new User(), {
    id: 3,
    locale: 'vi',
    onboardingDone: true,
    emailVerified: true,
    fullName: 'Thanh Quach',
    firstName: 'Thanh',
    lastName: 'Quach',
    email: 'student@example.com',
    password: '$2a$10$storedPasswordHash',
    provider: 'google',
    socialId: '109876543210987654321',
    role: { id: 2, name: 'User' },
    status: { id: 1, name: 'Active' },
  });

const plain = (groups?: string[]) =>
  instanceToPlain(user(), groups ? { groups } : undefined);

describe('User serialization', () => {
  // The one field that must never appear under any group, for any caller.
  it.each([undefined, ['me'], ['admin'], ['me', 'admin']])(
    'should never expose the password hash (groups: %p)',
    (groups) => {
      expect(plain(groups as string[] | undefined)).not.toHaveProperty(
        'password',
      );
    },
  );

  describe('with no group — any endpoint that did not opt in', () => {
    it('should withhold the email, the provider and the social id', () => {
      const body = plain();

      expect(body).not.toHaveProperty('email');
      expect(body).not.toHaveProperty('provider');
      expect(body).not.toHaveProperty('socialId');
    });

    // Under-sharing is the safe failure. A public endpoint returning a user
    // still gets the display fields, so forgetting a group degrades the
    // response rather than leaking an address.
    it('should still carry the display fields', () => {
      const body = plain();

      expect(body).toMatchObject({ id: 3, fullName: 'Thanh Quach' });
    });
  });

  describe("with the 'me' group — a user reading their own profile", () => {
    it('should carry the email and the provider', () => {
      const body = plain(['me']);

      expect(body.email).toBe('student@example.com');
      // The client gates its password form on this.
      expect(body.provider).toBe('google');
    });

    // The provider's subject identifier is a stable cross-service identifier
    // and the client has never read it, so it does not travel to the owner.
    it('should withhold the social id', () => {
      expect(plain(['me'])).not.toHaveProperty('socialId');
    });
  });

  describe("with the 'admin' group", () => {
    it('should carry the email and the social id', () => {
      const body = plain(['admin']);

      expect(body.email).toBe('student@example.com');
      expect(body.socialId).toBe('109876543210987654321');
    });
  });
});
