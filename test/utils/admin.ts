import request from 'supertest';

/** Seeded by the user seed; given Admin by AdminBootstrapSeedService. */
export const SEEDED_ADMIN_EMAIL = 'admin@example.com';
export const SEEDED_ADMIN_PASSWORD = 'secret';

export const ADMIN_ROLE_ID = 1;
export const USER_ROLE_ID = 2;
export const INSTRUCTOR_ROLE_ID = 4;

/**
 * Logs in the seeded Admin.
 *
 * Specs used to bootstrap by registering a user and POSTing themselves a role
 * through the generated `/user-roles` CRUD — the same self-service escalation
 * any student could perform. The seeded admin is the only way in.
 */
export const loginSeededSuperAdmin = async (app: string): Promise<string> => {
  const { body } = await request(app)
    .post('/api/v1/auth/email/login')
    .send({ email: SEEDED_ADMIN_EMAIL, password: SEEDED_ADMIN_PASSWORD })
    .expect(200);

  return body.token as string;
};

/** Gives a user exactly one role through the real admin route. */
export const setUserRole = async (
  app: string,
  adminToken: string,
  userId: number,
  roleId: number,
): Promise<void> => {
  await request(app)
    .put(`/api/v1/admin/users/${userId}/roles`)
    .auth(adminToken, { type: 'bearer' })
    .send({ roleId })
    .expect(200);
};

/** Makes a freshly registered fixture user an Admin. */
export const makeSuperAdmin = (
  app: string,
  adminToken: string,
  userId: number,
): Promise<void> => setUserRole(app, adminToken, userId, ADMIN_ROLE_ID);
