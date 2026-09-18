import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { Client } from 'pg';
import { APP_URL } from '../utils/constants';
import { Account, registerAndLogin } from '../utils/fixtures';
import { connectDb } from '../utils/db';

/**
 * Permission model §1.4 — linked providers on the caller's own account.
 *
 * Real Facebook and Google tokens cannot be minted here, so links are planted
 * in the database; what the provider verification decides is covered in
 * social-links.service.spec.ts.
 */
describe('Social links (§1.4)', () => {
  const app = APP_URL;
  let db: Client;

  const links = (account: Account) =>
    request(app)
      .get('/api/v1/auth/me/social-links')
      .auth(account.token, { type: 'bearer' });

  const plantLink = (account: Account, provider: string) =>
    db.query(
      `INSERT INTO "oauth_account" ("provider", "provider_uid", "user_id")
       VALUES ($1, $2, $3)`,
      [provider, `${provider}-${account.userId}-${Date.now()}`, account.userId],
    );

  beforeAll(async () => {
    db = await connectDb();
  });

  afterAll(async () => {
    await db.end();
  });

  it('should require a login', () =>
    request(app).get('/api/v1/auth/me/social-links').expect(401));

  it('should list no links and a password for a new email account', async () => {
    const account = await registerAndLogin(app, 'sl.fresh');

    const { body } = await links(account).expect(200);

    expect(body).toEqual({ links: [], hasPassword: true });
  });

  it('should list a linked provider', async () => {
    const account = await registerAndLogin(app, 'sl.linked');
    await plantLink(account, 'facebook');

    const { body } = await links(account).expect(200);

    expect(body.links).toEqual([
      { provider: 'facebook', linkedAt: expect.any(String) },
    ]);
  });

  // Checked before the provider is ever asked: a stolen access token alone
  // must not attach anyone's Facebook to this account.
  it('should require the account password to link', async () => {
    const account = await registerAndLogin(app, 'sl.stepup');

    const { body } = await request(app)
      .post('/api/v1/auth/me/social-links/facebook')
      .auth(account.token, { type: 'bearer' })
      .send({ accessToken: 'anything' })
      .expect(422);

    expect(body.errors).toEqual({ password: 'required' });
  });

  it('should refuse a wrong password', async () => {
    const account = await registerAndLogin(app, 'sl.wrong');

    const { body } = await request(app)
      .post('/api/v1/auth/me/social-links/google')
      .auth(account.token, { type: 'bearer' })
      .send({ idToken: 'anything', password: 'not-it' })
      .expect(422);

    expect(body.errors).toEqual({ password: 'incorrectPassword' });
  });

  it('should unlink a provider', async () => {
    const account = await registerAndLogin(app, 'sl.unlink');
    await plantLink(account, 'google');

    await request(app)
      .delete('/api/v1/auth/me/social-links/google')
      .auth(account.token, { type: 'bearer' })
      .expect(204);

    expect((await links(account).expect(200)).body.links).toEqual([]);
  });

  it('should 404 unlinking a provider that is not linked', async () => {
    const account = await registerAndLogin(app, 'sl.none');

    await request(app)
      .delete('/api/v1/auth/me/social-links/facebook')
      .auth(account.token, { type: 'bearer' })
      .expect(404);
  });

  it('should 404 an unknown provider', async () => {
    const account = await registerAndLogin(app, 'sl.apple');

    await request(app)
      .delete('/api/v1/auth/me/social-links/apple')
      .auth(account.token, { type: 'bearer' })
      .expect(404);
  });

  // AC-33
  it('should refuse to remove the last way to sign in', async () => {
    const account = await registerAndLogin(app, 'sl.last');
    await plantLink(account, 'facebook');
    // A social-only account: no password.
    await db.query(`UPDATE "user" SET "password" = NULL WHERE "id" = $1`, [
      account.userId,
    ]);

    const { body } = await request(app)
      .delete('/api/v1/auth/me/social-links/facebook')
      .auth(account.token, { type: 'bearer' })
      .expect(409);

    expect(body.error).toBe('last_login_method');
  });

  // Links belong to their owner: one user's link is invisible to another.
  it('should never show another account’s links', async () => {
    const owner = await registerAndLogin(app, 'sl.owner');
    const other = await registerAndLogin(app, 'sl.other');
    await plantLink(owner, 'facebook');

    expect((await links(other).expect(200)).body.links).toEqual([]);
    await request(app)
      .delete('/api/v1/auth/me/social-links/facebook')
      .auth(other.token, { type: 'bearer' })
      .expect(404);
  });
});
