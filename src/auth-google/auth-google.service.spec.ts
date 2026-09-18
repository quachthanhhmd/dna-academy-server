import { describe, expect, it, jest } from '@jest/globals';
import { AuthGoogleService } from './auth-google.service';

describe('AuthGoogleService', () => {
  const serviceReturning = (payload: Record<string, unknown>) => {
    const service = new AuthGoogleService({
      get: () => 'client-id',
      getOrThrow: () => 'client-id',
    } as any);

    (service as any).google = {
      verifyIdToken: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        getPayload: () => payload,
      }),
    };

    return service;
  };

  // The email is what social login matches existing accounts on. Google signs
  // an ID token for an address it has not verified, so trusting that address
  // lets anyone who types someone else's email into a Google account sign
  // into that person's account here.
  it('should drop an email Google has not verified', async () => {
    const profile = await serviceReturning({
      sub: 'google-1',
      email: 'victim@example.com',
      email_verified: false,
    }).getProfileByToken({ idToken: 'token' });

    expect(profile.id).toBe('google-1');
    expect(profile.email).toBeUndefined();
  });

  it('should drop an email when Google does not say whether it is verified', async () => {
    const profile = await serviceReturning({
      sub: 'google-2',
      email: 'victim@example.com',
    }).getProfileByToken({ idToken: 'token' });

    expect(profile.email).toBeUndefined();
  });

  it('should keep an email Google has verified', async () => {
    const profile = await serviceReturning({
      sub: 'google-3',
      email: 'owner@example.com',
      email_verified: true,
    }).getProfileByToken({ idToken: 'token' });

    expect(profile.email).toBe('owner@example.com');
  });
});
