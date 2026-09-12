import request from 'supertest';

/** Seeded by SuperAdminSeedService on every boot. */
export const SEEDED_ADMIN_EMAIL = 'admin@example.com';
export const SEEDED_ADMIN_PASSWORD = 'secret';

export const SUPER_ADMIN_ROLE_ID = 3;

/**
 * Logs in the seeded account that holds Super Admin in `user_role`.
 *
 * Specs used to bootstrap by registering a user and POSTing themselves the
 * role through the generated `/user-roles` CRUD — the same self-service
 * escalation any student could perform. That controller is gone; the seeded
 * admin is now the only way in, which is the point.
 */
export const loginSeededSuperAdmin = async (app: string): Promise<string> => {
  const { body } = await request(app)
    .post('/api/v1/auth/email/login')
    .send({ email: SEEDED_ADMIN_EMAIL, password: SEEDED_ADMIN_PASSWORD })
    .expect(200);

  return body.token as string;
};

/**
 * Replaces a user's roles through the real admin route. `roleIds` is the
 * complete set, not a delta — that is what `PUT /admin/users/:id/roles` means.
 */
export const setUserRoles = async (
  app: string,
  superAdminToken: string,
  userId: number,
  roleIds: number[],
): Promise<void> => {
  await request(app)
    .put(`/api/v1/admin/users/${userId}/roles`)
    .auth(superAdminToken, { type: 'bearer' })
    .send({ roleIds })
    .expect(200);
};

/** Grants Super Admin to a freshly registered fixture user. */
export const makeSuperAdmin = (
  app: string,
  superAdminToken: string,
  userId: number,
): Promise<void> =>
  setUserRoles(app, superAdminToken, userId, [SUPER_ADMIN_ROLE_ID]);
