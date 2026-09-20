import { S3Client } from '@aws-sdk/client-s3';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { FileConfig } from '../../../config/file-config.type';

/**
 * Cloudflare R2 speaks the S3 API, so it is driven by the same client as S3:
 *   - `region` is always `auto`
 *   - requests go to the account endpoint instead of AWS
 *   - checksums are only sent when the operation requires them; R2 rejects the
 *     additional checksum headers the SDK adds by default
 *   - ACLs are not supported — public access comes from a public bucket or a
 *     custom domain (`R2_PUBLIC_URL`), otherwise objects are served through
 *     presigned URLs
 */
export const createR2Client = (config: FileConfig): S3Client =>
  new S3Client({
    region: 'auto',
    endpoint: config.r2Endpoint,
    credentials: {
      accessKeyId: config.r2AccessKeyId ?? '',
      secretAccessKey: config.r2SecretAccessKey ?? '',
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

/**
 * Course thumbnails and instructor avatars (images) plus lecture documents
 * (`pdf_document` lecture content). Shared with every other driver.
 */
export { ALLOWED_FILE_EXTENSIONS } from '../../../file-upload-rules';

export const buildObjectKey = (originalName: string): string => {
  const extension = originalName.split('.').pop()?.toLowerCase();

  return extension
    ? `${randomStringGenerator()}.${extension}`
    : randomStringGenerator();
};

/**
 * Public URL of an object, when the bucket is exposed through r2.dev or a
 * custom domain. Returns `undefined` when no public base URL is configured.
 */
export const buildPublicUrl = (
  config: FileConfig,
  key: string,
): string | undefined =>
  config.r2PublicUrl ? `${config.r2PublicUrl}/${key}` : undefined;
