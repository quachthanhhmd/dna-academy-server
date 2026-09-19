import request from 'supertest';

let counter = 0;

/** A unique address for a fixture account. */
export const uniqueEmail = (label: string): string =>
  `${label}.${Date.now()}.${(counter += 1)}.${Math.random()
    .toString(36)
    .slice(2, 7)}@example.com`;

export type Account = { token: string; userId: number; email: string };

/** Registers a learner and logs them in. */
export const registerAndLogin = async (
  app: string,
  label: string,
  password = 'secret-123',
): Promise<Account> => {
  const email = uniqueEmail(label);

  await request(app)
    .post('/api/v1/auth/email/register')
    .send({ email, password, firstName: 'Fixture', lastName: label })
    .expect(204);

  return login(app, email, password);
};

export const login = async (
  app: string,
  email: string,
  password = 'secret-123',
): Promise<Account> => {
  const { body } = await request(app)
    .post('/api/v1/auth/email/login')
    .send({ email, password })
    .expect(200);

  return { token: body.token, userId: body.user.id, email };
};

/** Creates a bare active instructor profile, optionally linked to a user. */
export const createInstructorProfile = async (
  app: string,
  adminToken: string,
  opts: { userId?: number; name?: string } = {},
): Promise<string> => {
  const { body } = await request(app)
    .post('/api/v1/admin/instructors')
    .auth(adminToken, { type: 'bearer' })
    .send({
      fullName: opts.name ?? `Fixture Instructor ${uniqueEmail('i')}`,
      expertiseCodeIds: [],
      ...(opts.userId !== undefined ? { userId: opts.userId } : {}),
    })
    .expect(201);

  return body.id as string;
};

/** Creates a draft course, optionally with a teaching team. */
export const createCourse = async (
  app: string,
  adminToken: string,
  opts: { primaryInstructorId?: string; coInstructorIds?: string[] } = {},
): Promise<string> => {
  const code = `FX-${Date.now()}-${(counter += 1)}`;
  const { body } = await request(app)
    .post('/api/v1/admin/courses')
    .auth(adminToken, { type: 'bearer' })
    .send({
      courseId: code,
      title: `Fixture course ${code}`,
      language: 'en',
      price: 0,
      hasCertificate: false,
      enrollmentOpen: true,
      ...opts,
    })
    .expect(201);

  return body.id as string;
};
