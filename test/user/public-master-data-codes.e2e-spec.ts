import { describe, expect, it, beforeAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';

describe('Public GET /master-data/codes', () => {
  const app = APP_URL;
  const runId = Date.now();
  const groupKey = `public_codes_test_${runId}`;

  let activeCodeId: string;
  let inactiveCodeId: string;

  beforeAll(async () => {
    // Any authenticated user can manage master data (see epic-1) — use a
    // throwaway account purely to seed fixtures for this public-read test.
    const email = `public-codes.setup.${runId}@example.com`;
    await request(app)
      .post('/api/v1/auth/email/register')
      .send({ email, password: 'secret', firstName: 'Setup', lastName: 'X' })
      .expect(204);
    const { body: login } = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email, password: 'secret' })
      .expect(200);
    const token = login.token as string;

    const { body: group } = await request(app)
      .post('/api/v1/master-data-groups')
      .auth(token, { type: 'bearer' })
      .send({
        displayOrder: 1,
        isActive: true,
        name: `Public codes test ${runId}`,
        groupKey,
      })
      .expect(201);

    const { body: active } = await request(app)
      .post('/api/v1/master-data-codes')
      .auth(token, { type: 'bearer' })
      .send({
        displayOrder: 1,
        isActive: true,
        name: 'Active Code',
        code: 'active_code',
        group: { id: group.id },
      })
      .expect(201);
    activeCodeId = active.id;

    const { body: inactive } = await request(app)
      .post('/api/v1/master-data-codes')
      .auth(token, { type: 'bearer' })
      .send({
        displayOrder: 2,
        isActive: false,
        name: 'Inactive Code',
        code: 'inactive_code',
        group: { id: group.id },
      })
      .expect(201);
    inactiveCodeId = inactive.id;
  });

  it('should require no authentication', async () => {
    await request(app)
      .get(`/api/v1/master-data/codes?groupKey=${groupKey}`)
      .expect(200);
  });

  it('should return only active codes for the given groupKey', async () => {
    const { body } = await request(app)
      .get(`/api/v1/master-data/codes?groupKey=${groupKey}`)
      .expect(200);

    const ids = body.map((code) => code.id);
    expect(ids).toContain(activeCodeId);
    expect(ids).not.toContain(inactiveCodeId);
    body.forEach((code) => {
      expect(code.isActive).toBe(true);
      expect(code.group.groupKey).toBe(groupKey);
    });
  });
});
