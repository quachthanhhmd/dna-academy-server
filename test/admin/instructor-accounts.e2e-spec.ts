import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL, MAIL_HOST, MAIL_PORT } from '../utils/constants';
import {
  INSTRUCTOR_ROLE_ID,
  loginSeededSuperAdmin,
  setUserRole,
} from '../utils/admin';
import { registerAndLogin, uniqueEmail } from '../utils/fixtures';

/**
 * Permission model §1.5 / §1.7 / §2.9 (BE-13) — an admin creates an
 * instructor's login account; the instructor sets a password through a
 * single-use invite (R1).
 */
describe('Instructor accounts (§1.7)', () => {
  const app = APP_URL;
  const mail = `http://${MAIL_HOST}:${MAIL_PORT}`;
  let adminToken: string;

  const INVITE_LINK = /password-change\?hash=([^&\s"]+)/;

  /** Every invite hash sent to `to`, oldest first. */
  const invitesTo = async (to: string): Promise<string[]> => {
    const { body } = await request(mail).get('/email');
    return (body as { to: { address: string }[]; text: string }[])
      .filter((item) => item.to[0].address.toLowerCase() === to.toLowerCase())
      .map((item) => item.text.match(INVITE_LINK)?.[1])
      .filter((hash): hash is string => Boolean(hash));
  };

  const create = (token: string, body: Record<string, unknown>) =>
    request(app)
      .post('/api/v1/admin/instructors')
      .auth(token, { type: 'bearer' })
      .send({
        fullName: `Invited ${Date.now()}`,
        expertiseCodeIds: [],
        ...body,
      });

  const setPassword = (hash: string, password = 'chosen-by-invitee') =>
    request(app).post('/api/v1/auth/reset/password').send({ hash, password });

  const detail = async (id: string) => {
    const { body } = await request(app)
      .get(`/api/v1/admin/instructors/${id}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    return body;
  };

  beforeAll(async () => {
    adminToken = await loginSeededSuperAdmin(app);
  });

  describe('creating an instructor with an account (AC-15)', () => {
    const email = uniqueEmail('ia.invitee');
    let created: { id: string; userId: number };

    beforeAll(async () => {
      const { body } = await create(adminToken, {
        createAccount: true,
        accountEmail: email,
      }).expect(201);
      created = body;
    });

    it('should report the account and the invite', async () => {
      const { body } = await request(app)
        .get(`/api/v1/admin/instructors/${created.id}`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      expect(created).toMatchObject({ hasAccount: true, inviteSent: true });
      expect(body).toMatchObject({
        userId: created.userId,
        hasAccount: true,
        accountActivated: false,
      });
    });

    it('should give the account the Instructor role', async () => {
      const { body } = await request(app)
        .get(`/api/v1/admin/users/${created.userId}/roles`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);

      expect(body.map((r: { id: number }) => r.id)).toEqual([
        INSTRUCTOR_ROLE_ID,
      ]);
    });

    it('should not let anyone sign in before a password is set', () =>
      request(app)
        .post('/api/v1/auth/email/login')
        .send({ email, password: '' })
        .expect(422));

    it('should send the invite to the account email', async () => {
      expect(await invitesTo(email)).toHaveLength(1);
    });

    describe('the invitee', () => {
      let hash: string;

      beforeAll(async () => {
        [hash] = await invitesTo(email);
        await setPassword(hash).expect(204);
      });

      it('should sign in with the password they chose', async () => {
        const { body } = await request(app)
          .post('/api/v1/auth/email/login')
          .send({ email, password: 'chosen-by-invitee' })
          .expect(200);

        // Following the link proved the address.
        expect(body.user.emailVerified).toBe(true);
      });

      // AC-17
      it('should not be able to use the invite twice', async () => {
        const { body } = await setPassword(hash, 'attacker-second-use').expect(
          422,
        );

        expect(body.errors).toEqual({ hash: 'invalidHash' });
      });

      it('should show as activated', async () => {
        expect((await detail(created.id)).accountActivated).toBe(true);
      });

      it('should get 409 already_activated on a resend', async () => {
        const { body } = await request(app)
          .post(`/api/v1/admin/instructors/${created.id}/invite`)
          .auth(adminToken, { type: 'bearer' })
          .expect(409);

        expect(body.error).toBe('already_activated');
      });
    });
  });

  describe('validation', () => {
    it('should require accountEmail with createAccount', async () => {
      const { body } = await create(adminToken, { createAccount: true }).expect(
        422,
      );

      expect(body.errors).toEqual({ accountEmail: 'required' });
    });

    it('should refuse createAccount together with userId', async () => {
      const learner = await registerAndLogin(app, 'ia.linked');

      const { body } = await create(adminToken, {
        createAccount: true,
        accountEmail: uniqueEmail('ia.both'),
        userId: learner.userId,
      }).expect(422);

      expect(body.errors).toEqual({ userId: 'conflictsWithCreateAccount' });
    });

    // AC-16 — and nothing is written.
    it('should refuse an email that is already registered', async () => {
      const existing = await registerAndLogin(app, 'ia.taken');
      const fullName = `Should not exist ${Date.now()}`;

      const { body } = await create(adminToken, {
        fullName,
        createAccount: true,
        accountEmail: existing.email,
      }).expect(422);

      expect(body.errors).toEqual({ accountEmail: 'emailAlreadyExists' });
      const { body: list } = await request(app)
        .get('/api/v1/admin/instructors')
        .query({ q: fullName })
        .auth(adminToken, { type: 'bearer' })
        .expect(200);
      expect(list.data).toEqual([]);
    });

    it('should report hasAccount false for a profile without one', async () => {
      const { body } = await create(adminToken, {}).expect(201);

      expect(body).toMatchObject({ hasAccount: false, userId: null });
      expect((await detail(body.id)).accountActivated).toBe(false);
    });
  });

  describe('permission', () => {
    it('should require instructors:create_account for createAccount', async () => {
      const creator = await registerAndLogin(app, 'ia.creator');
      const { body: role } = await request(app)
        .post('/api/v1/admin/roles')
        .auth(adminToken, { type: 'bearer' })
        .send({ name: `IA creator ${Date.now()}` })
        .expect(201);
      const { body: matrix } = await request(app)
        .get(`/api/v1/admin/roles/${role.id}/permissions`)
        .auth(adminToken, { type: 'bearer' })
        .expect(200);
      const instructors = matrix.find(
        (m: { module: { name: string } }) => m.module.name === 'instructors',
      );
      await request(app)
        .put(`/api/v1/admin/roles/${role.id}/permissions`)
        .auth(adminToken, { type: 'bearer' })
        .send({
          permissionIds: instructors.permissions
            .filter((p: { action: string }) =>
              ['view', 'create'].includes(p.action),
            )
            .map((p: { id: string }) => p.id),
        })
        .expect(200);
      await setUserRole(app, adminToken, creator.userId, role.id);

      const { body } = await create(creator.token, {
        createAccount: true,
        accountEmail: uniqueEmail('ia.denied'),
      }).expect(403);

      expect(body.required).toEqual({
        module: 'instructors',
        action: 'create_account',
      });
      // Without an account it is an ordinary create.
      await create(creator.token, {}).expect(201);
    });
  });

  describe('POST /admin/instructors/:id/invite', () => {
    it('should 409 no_linked_account for a profile without an account', async () => {
      const { body: profile } = await create(adminToken, {}).expect(201);

      const { body } = await request(app)
        .post(`/api/v1/admin/instructors/${profile.id}/invite`)
        .auth(adminToken, { type: 'bearer' })
        .expect(409);

      expect(body.error).toBe('no_linked_account');
    });

    it('should resend the invite to an account not yet activated', async () => {
      const email = uniqueEmail('ia.resend');
      const { body: profile } = await create(adminToken, {
        createAccount: true,
        accountEmail: email,
      }).expect(201);

      await request(app)
        .post(`/api/v1/admin/instructors/${profile.id}/invite`)
        .auth(adminToken, { type: 'bearer' })
        .expect(204);

      expect(await invitesTo(email)).toHaveLength(2);
    });

    it('should 404 an unknown profile', () =>
      request(app)
        .post(
          '/api/v1/admin/instructors/00000000-0000-4000-8000-000000000000/invite',
        )
        .auth(adminToken, { type: 'bearer' })
        .expect(404));
  });
});
