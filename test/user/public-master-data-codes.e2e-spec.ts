import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';
import { loginSeededSuperAdmin } from '../utils/admin';
import { deactivateMasterDataCodes } from '../utils/cleanup';

describe('Public GET /master-data/codes', () => {
  const app = APP_URL;
  const runId = Date.now();
  // A seeded group: master data groups have no create route, and fixture
  // codes go in through the admin route like real ones do.
  const groupKey = 'course_level';

  let adminToken: string;
  let activeCodeId: string;
  let inactiveCodeId: string;

  const createCode = async (name: string, isActive: boolean) => {
    const { body } = await request(app)
      .post(`/api/v1/admin/master-data/groups/${groupKey}/codes`)
      .auth(adminToken, { type: 'bearer' })
      .send({
        displayOrder: 1,
        isActive,
        name: `${name} ${runId}`,
        code: `${name.toLowerCase().replace(/\s+/g, '_')}_${runId}`,
      })
      .expect(201);

    return body.id as string;
  };

  beforeAll(async () => {
    adminToken = await loginSeededSuperAdmin(app);
    activeCodeId = await createCode('Active Code', true);
    inactiveCodeId = await createCode('Inactive Code', false);
  });

  afterAll(() =>
    deactivateMasterDataCodes(app, adminToken, groupKey, [activeCodeId]),
  );

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
