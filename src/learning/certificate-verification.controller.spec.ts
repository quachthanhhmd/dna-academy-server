import { describe, expect, it } from '@jest/globals';
import { CertificateVerificationController } from './certificate-verification.controller';
import { RATE_LIMIT_METADATA_KEY } from '../utils/rate-limit/rate-limit.guard';

/**
 * Epic 4.1 D3 — the limiter is the only thing making a walk of the certificate
 * sequence impractical, so its presence and its budget are asserted rather
 * than assumed.
 *
 * Checked as metadata rather than by firing a burst at the running API: the
 * limiter is one shared in-process window, so an e2e that exhausts it starves
 * every other test that touches the same route.
 */
describe('CertificateVerificationController rate limit', () => {
  const options = Reflect.getMetadata(
    RATE_LIMIT_METADATA_KEY,
    CertificateVerificationController.prototype.verify,
  );

  it('should declare a rate limit on the public verify route', () => {
    expect(options).toBeDefined();
  });

  it('should allow 20 calls a minute', () => {
    expect(options).toEqual([{ limit: 20, windowMs: 60_000, by: 'caller' }]);
  });
});
