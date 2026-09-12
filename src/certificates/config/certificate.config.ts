import { registerAs } from '@nestjs/config';

import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { CertificateConfig } from './certificate-config.type';

export const DEFAULT_CERTIFICATE_ISSUER_NAME = 'DNA Learning Academy';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  CERTIFICATE_ISSUER_NAME: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  CERTIFICATE_SIGNATURE_URL?: string;
}

/**
 * Epic 4.1 §3.4. Validated at boot rather than at render time: a blank issuer
 * prints a blank line onto a certificate a student then keeps, and an
 * unreachable signature URL leaves a broken image on the same document.
 */
export default registerAs<CertificateConfig>('certificate', () => {
  const signature = process.env.CERTIFICATE_SIGNATURE_URL?.trim();
  const issuer = process.env.CERTIFICATE_ISSUER_NAME?.trim();

  const validated = validateConfig(
    {
      CERTIFICATE_ISSUER_NAME: issuer || DEFAULT_CERTIFICATE_ISSUER_NAME,
      // Absent and empty mean the same thing: draw the placeholder stroke.
      ...(signature ? { CERTIFICATE_SIGNATURE_URL: signature } : {}),
    },
    EnvironmentVariablesValidator,
  );

  return {
    issuerName: validated.CERTIFICATE_ISSUER_NAME,
    signatureUrl: validated.CERTIFICATE_SIGNATURE_URL ?? null,
  };
});
