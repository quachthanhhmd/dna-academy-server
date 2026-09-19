import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin } from '../utils/admin';
import { registerAndLogin, uniqueEmail } from '../utils/fixtures';

/**
 * Rate limits on the endpoints that check a secret or send an email.
 *
 * Only the per-email and per-target limits are exercised here: every request
 * in this suite comes from one machine, so the per-IP limits are widened by
 * RATE_LIMIT_IP_MULTIPLIER in the test env and covered by
 * rate-limit.rules.spec.ts instead.
 */
describe('Auth rate limits', () => {
  const app = APP_URL;

  const expectLimited = (res: request.Response) => {
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ code: 'RATE_LIMITED' });
    expect(res.body.retryAfterSecs).toBeGreaterThan(0);
  };

  /** The route-level limits also send the standard header. */
  const expectRetryAfterHeader = (res: request.Response) => {
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  };

  // Password guessing against one account: 10 tries per 15 minutes.
  // Failures only: the successful sign-in that registerAndLogin makes does
  // not count, and the right password is refused once the limit is hit.
  it('should refuse the 11th login after 10 failures for one email', async () => {
    const account = await registerAndLogin(app, 'rl.login');
    const attempt = (password: string) =>
      request(app)
        .post('/api/v1/auth/email/login')
        .send({ email: account.email, password });

    for (let i = 0; i < 10; i += 1) {
      expect((await attempt('wrong-guess')).status).toBe(422);
    }

    expectLimited(await attempt('secret-123'));
  });

  // The limit is per email: someone else's lockout is not yours.
  it('should not limit a different email', async () => {
    const other = await registerAndLogin(app, 'rl.other');

    await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email: other.email, password: 'secret-123' })
      .expect(200);
  });

  // Mail bombing someone's inbox: 3 reset emails per hour per address.
  it('should stop the 4th password reset email for one address', async () => {
    const account = await registerAndLogin(app, 'rl.forgot');
    const ask = () =>
      request(app)
        .post('/api/v1/auth/forgot/password')
        .send({ email: account.email });

    for (let i = 0; i < 3; i += 1) {
      expect((await ask()).status).toBe(204);
    }

    const limited = await ask();
    expectLimited(limited);
    expectRetryAfterHeader(limited);
  });

  it('should limit reset requests for an unknown address the same way', async () => {
    const email = uniqueEmail('rl.unknown');
    const ask = () =>
      request(app).post('/api/v1/auth/forgot/password').send({ email });

    for (let i = 0; i < 3; i += 1) {
      await ask();
    }

    expectLimited(await ask());
  });

  it('should stop the 4th confirmation email for one address', async () => {
    const account = await registerAndLogin(app, 'rl.resend'); // sent 1
    const resend = () =>
      request(app)
        .post('/api/v1/auth/email/confirm/resend')
        .send({ email: account.email });

    for (let i = 0; i < 3; i += 1) {
      expect((await resend()).status).toBe(204);
    }

    expectLimited(await resend());
  });

  describe('instructor invites', () => {
    let adminToken: string;

    beforeAll(async () => {
      adminToken = await loginSeededSuperAdmin(app);
    });

    // 3 invites per hour to one instructor, on top of the one sent on create.
    it('should stop the 4th resend to one instructor', async () => {
      const { body: profile } = await request(app)
        .post('/api/v1/admin/instructors')
        .auth(adminToken, { type: 'bearer' })
        .send({
          fullName: `RL invite ${Date.now()}`,
          expertiseCodeIds: [],
          createAccount: true,
          accountEmail: uniqueEmail('rl.invite'),
        })
        .expect(201);
      const resend = () =>
        request(app)
          .post(`/api/v1/admin/instructors/${profile.id}/invite`)
          .auth(adminToken, { type: 'bearer' });

      for (let i = 0; i < 3; i += 1) {
        expect((await resend()).status).toBe(204);
      }

      expectLimited(await resend());
    });
  });

  // A stolen access token must not become an unlimited password oracle.
  it('should limit password checks on social linking per account', async () => {
    const account = await registerAndLogin(app, 'rl.link');
    const guess = () =>
      request(app)
        .post('/api/v1/auth/me/social-links/google')
        .auth(account.token, { type: 'bearer' })
        .send({ idToken: 'x', password: 'wrong-guess' });

    for (let i = 0; i < 10; i += 1) {
      expect((await guess()).status).toBe(422);
    }

    expectLimited(await guess());
  });
});
