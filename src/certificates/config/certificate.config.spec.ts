import { describe, expect, it, afterEach } from '@jest/globals';
import certificateConfig from './certificate.config';

/**
 * Epic 4.1 §3.4 — both keys are validated at boot for the same reason the
 * learning keys are: a blank issuer renders a blank line onto a certificate,
 * and nobody notices until a student downloads one.
 */
describe('certificateConfig', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  const load = () => (certificateConfig as unknown as () => unknown)();

  it('should default the issuer name', () => {
    delete process.env.CERTIFICATE_ISSUER_NAME;

    expect(load()).toMatchObject({ issuerName: 'DNA Learning Academy' });
  });

  it('should read the issuer name from the environment', () => {
    process.env.CERTIFICATE_ISSUER_NAME = 'Học viện DNA';

    expect(load()).toMatchObject({ issuerName: 'Học viện DNA' });
  });

  // `env-cmd` hands an unset key through as an empty string, so blank means
  // "not configured" here exactly as it does in learning.config — not "print
  // nothing". What must never happen is a blank reaching the certificate.
  it('should treat a blank issuer name as unset and fall back', () => {
    process.env.CERTIFICATE_ISSUER_NAME = '   ';

    expect(load()).toMatchObject({ issuerName: 'DNA Learning Academy' });
  });

  it('should never resolve the issuer name to a blank string', () => {
    for (const value of ['', '   ', '\t']) {
      process.env.CERTIFICATE_ISSUER_NAME = value;

      expect((load() as { issuerName: string }).issuerName.trim()).not.toBe('');
    }
  });

  it('should default the signature url to null', () => {
    delete process.env.CERTIFICATE_SIGNATURE_URL;

    expect(load()).toMatchObject({ signatureUrl: null });
  });

  it('should treat an empty signature url as absent', () => {
    process.env.CERTIFICATE_SIGNATURE_URL = '';

    expect(load()).toMatchObject({ signatureUrl: null });
  });

  it('should accept a valid signature url', () => {
    process.env.CERTIFICATE_SIGNATURE_URL = 'https://cdn.example.com/sig.png';

    expect(load()).toMatchObject({
      signatureUrl: 'https://cdn.example.com/sig.png',
    });
  });

  it('should reject a signature url that is not a url', () => {
    process.env.CERTIFICATE_SIGNATURE_URL = 'not a url';

    expect(load).toThrow();
  });
});
