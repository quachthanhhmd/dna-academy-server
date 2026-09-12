import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from '../utils/constants';

/**
 * Epic 4.1 D3 — `GET /certificate-verify/:number`, public and unauthenticated.
 *
 * Deliberately only three requests. The route is rate-limited to 20/min per IP
 * against a long-lived server, so a suite that spends the budget here starves
 * itself on the next run inside the same minute. The exhaustive malformed-input
 * matrix lives in `certificate-verification.service.spec.ts`, which needs no
 * budget at all; this file only proves the wiring.
 */
describe('Epic 4.1 — public certificate verification', () => {
  const app = APP_URL;

  it('should be reachable without a token', async () => {
    const response = await request(app).get(
      '/api/v1/certificate-verify/DNA-2999-999999',
    );

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });

  it('should answer an unknown number with exactly { valid: false }', async () => {
    await request(app)
      .get('/api/v1/certificate-verify/DNA-2999-999998')
      .expect(404)
      .expect(({ body }) => expect(body.valid).toBe(false));
  });

  // Identical body for malformed and unknown, so the endpoint cannot be used
  // to learn which numbers are well-formed and therefore which could exist.
  it('should answer a malformed number identically to an unknown one', async () => {
    await request(app)
      .get('/api/v1/certificate-verify/not-a-number')
      .expect(404)
      .expect(({ body }) => expect(body).toEqual({ valid: false }));
  });
});
