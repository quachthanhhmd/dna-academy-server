import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import {
  APP_URL,
  TESTER_EMAIL,
  TESTER_PASSWORD,
  MAIL_HOST,
  MAIL_PORT,
} from '../utils/constants';

/**
 * Regression suite for the authentication hardening pass.
 *
 * Each block pins one hole that was open on the server. They are written
 * against HTTP rather than the service so that a route re-mounted by a
 * generator, a module wired back in, or a DTO losing a decorator all fail
 * here — the unit specs cannot see any of those.
 *
 * Social login's linking rules (verified-email matching, pre-account hijacking,
 * privileged accounts) need real Facebook and Google tokens, so they are
 * covered in auth.service.spec.ts instead.
 */
describe('Auth security', () => {
  const app = APP_URL;
  const mail = `http://${MAIL_HOST}:${MAIL_PORT}`;
  const password = 'secret-123';

  const uniqueEmail = (label: string) =>
    `sec.${label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;

  const register = (email: string) =>
    request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password, firstName: 'Sec', lastName: 'E2E' })
      .expect(204);

  const login = (email: string, pass = password) =>
    request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password: pass });

  /** The most recent letter to `to` whose text matches `pattern`, or undefined. */
  const latestHash = async (to: string, pattern: RegExp) => {
    const { body } = await request(mail).get('/email');
    const letter = (body as { to: { address: string }[]; text: string }[])
      .filter(
        (item) =>
          item.to[0].address.toLowerCase() === to.toLowerCase() &&
          pattern.test(item.text),
      )
      .pop();

    return letter?.text.match(pattern)?.[1];
  };

  const RESET_LINK = /password-change\?hash=([^&\s]+)/;
  const NEW_EMAIL_LINK = /confirm-new-email\?hash=([^&\s]+)/;

  describe('Social account links are not a client API', () => {
    let userToken: string;

    beforeAll(async () => {
      userToken = await login(TESTER_EMAIL, TESTER_PASSWORD).then(
        ({ body }) => body.token,
      );
    });

    // Creating a link to someone else's account let any logged-in user sign in
    // as them — including every admin — through Facebook login.
    it('should not let a user attach a social identity to another account', () => {
      return request(app)
        .post('/api/v1/oauth-accounts')
        .auth(userToken, { type: 'bearer' })
        .send({
          provider: 'facebook',
          providerUid: `attacker-${Date.now()}`,
          user: { id: 1 },
        })
        .expect(404);
    });

    // The list carried every user's provider access and refresh tokens.
    it('should not list other users’ social links', () => {
      return request(app)
        .get('/api/v1/oauth-accounts')
        .auth(userToken, { type: 'bearer' })
        .expect(404);
    });
  });

  describe('Apple sign-in', () => {
    it('should not be mounted', () => {
      return request(app)
        .post('/api/v1/auth/apple/login')
        .send({ idToken: 'any' })
        .expect(404);
    });
  });

  describe('Password reset', () => {
    it('should enforce the same minimum length as registration', () => {
      return request(app)
        .post('/api/v1/auth/reset/password')
        .send({ hash: 'irrelevant', password: 'a' })
        .expect(422)
        .expect(({ body }) => {
          expect(body.errors.password).toBeDefined();
        });
    });

    it('should accept a reset link only once', async () => {
      const email = uniqueEmail('reset-once');
      await register(email);

      await request(app)
        .post('/api/v1/auth/forgot/password')
        .send({ email })
        .expect(204);
      const hash = await latestHash(email, RESET_LINK);
      expect(hash).toBeDefined();

      await request(app)
        .post('/api/v1/auth/reset/password')
        .send({ hash, password: 'first-reset' })
        .expect(204);

      await request(app)
        .post('/api/v1/auth/reset/password')
        .send({ hash, password: 'replayed-reset' })
        .expect(422)
        .expect(({ body }) => {
          expect(body.errors.hash).toBe('invalidHash');
        });

      await login(email, 'replayed-reset').expect(422);
      await login(email, 'first-reset').expect(200);
    });

    it('should reject a reset link issued before the password was changed another way', async () => {
      const email = uniqueEmail('reset-stale');
      await register(email);
      const token = await login(email).then(({ body }) => body.token);

      await request(app)
        .post('/api/v1/auth/forgot/password')
        .send({ email })
        .expect(204);
      const hash = await latestHash(email, RESET_LINK);
      expect(hash).toBeDefined();

      await request(app)
        .patch('/api/v1/auth/me')
        .auth(token, { type: 'bearer' })
        .send({ password: 'changed-in-profile', oldPassword: password })
        .expect(200);

      await request(app)
        .post('/api/v1/auth/reset/password')
        .send({ hash, password: 'stale-link-reset' })
        .expect(422);

      await login(email, 'changed-in-profile').expect(200);
    });
  });

  describe('Refresh tokens', () => {
    // A refresh token presented twice means two parties hold it. Revoking the
    // session logs out whichever of them is the thief.
    it('should revoke the session when a rotated refresh token is replayed', async () => {
      const email = uniqueEmail('refresh-reuse');
      await register(email);
      const first = await login(email).then(({ body }) => body.refreshToken);

      const second = await request(app)
        .post('/api/v1/auth/refresh')
        .auth(first, { type: 'bearer' })
        .expect(200)
        .then(({ body }) => body.refreshToken);

      await request(app)
        .post('/api/v1/auth/refresh')
        .auth(first, { type: 'bearer' })
        .expect(401);

      await request(app)
        .post('/api/v1/auth/refresh')
        .auth(second, { type: 'bearer' })
        .expect(401);
    });

    // Guard, not a new behaviour: pins that logout really ends the session.
    it('should reject a refresh token after logout', async () => {
      const email = uniqueEmail('refresh-logout');
      await register(email);
      const { token, refreshToken } = await login(email).then(
        ({ body }) => body,
      );

      await request(app)
        .post('/api/v1/auth/logout')
        .auth(token, { type: 'bearer' })
        .expect(204);

      await request(app)
        .post('/api/v1/auth/refresh')
        .auth(refreshToken, { type: 'bearer' })
        .expect(401);
    });
  });

  describe('Email change confirmation', () => {
    // A confirm link emailed to an address the user abandoned — a typo, an old
    // work inbox — must not be able to move the account back there later, where
    // "forgot password" would hand the account to whoever reads that inbox.
    it('should reject a link for an email change that was superseded', async () => {
      const email = uniqueEmail('change-origin');
      const abandoned = uniqueEmail('change-abandoned');
      const kept = uniqueEmail('change-kept');
      await register(email);
      const token = await login(email).then(({ body }) => body.token);

      await request(app)
        .patch('/api/v1/auth/me')
        .auth(token, { type: 'bearer' })
        .send({ email: abandoned })
        .expect(200);
      const abandonedHash = await latestHash(abandoned, NEW_EMAIL_LINK);

      await request(app)
        .patch('/api/v1/auth/me')
        .auth(token, { type: 'bearer' })
        .send({ email: kept })
        .expect(200);
      const keptHash = await latestHash(kept, NEW_EMAIL_LINK);

      await request(app)
        .post('/api/v1/auth/email/confirm/new')
        .send({ hash: keptHash })
        .expect(204);

      await request(app)
        .post('/api/v1/auth/email/confirm/new')
        .send({ hash: abandonedHash })
        .expect(422);

      await request(app)
        .get('/api/v1/auth/me')
        .auth(token, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.email).toBe(kept.toLowerCase());
        });
    });

    it('should accept a confirm link only once', async () => {
      const email = uniqueEmail('confirm-once');
      const next = uniqueEmail('confirm-once-next');
      await register(email);
      const token = await login(email).then(({ body }) => body.token);

      await request(app)
        .patch('/api/v1/auth/me')
        .auth(token, { type: 'bearer' })
        .send({ email: next })
        .expect(200);
      const hash = await latestHash(next, NEW_EMAIL_LINK);

      await request(app)
        .post('/api/v1/auth/email/confirm/new')
        .send({ hash })
        .expect(204);

      await request(app)
        .post('/api/v1/auth/email/confirm/new')
        .send({ hash })
        .expect(422);
    });
  });
});
