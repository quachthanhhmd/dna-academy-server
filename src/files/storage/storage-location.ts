import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { FileConfig, FileDriver } from '../config/file-config.type';
import { FilePurpose, FileVisibility, purposeRule } from './file-purpose';

/**
 * `media_file.bucket` holds a real bucket name, or one of these markers.
 */
export const StorageBucketMarker = {
  /** On the API's own disk (`FILE_DRIVER=local`); the key is the download route. */
  LOCAL: 'local',
  /** Not ours: the key is already an absolute URL (e.g. an OAuth avatar). */
  EXTERNAL: 'external',
  /**
   * Stored before rows recorded their bucket. Resolves against the bucket the
   * active driver was configured with back then (`R2_BUCKET`,
   * `AWS_DEFAULT_S3_BUCKET`).
   */
  LEGACY: 'legacy',
} as const;

/**
 * The quiz upload used to write the driver's name into `media_file.bucket`.
 * Those rows mean exactly what {@link StorageBucketMarker.LEGACY} means.
 */
const LEGACY_BUCKET_VALUES: readonly string[] = [
  StorageBucketMarker.LEGACY,
  FileDriver.R2,
  FileDriver.R2_PRESIGNED,
  FileDriver.S3,
  FileDriver.S3_PRESIGNED,
];

export const isLegacyBucket = (bucket: string) =>
  LEGACY_BUCKET_VALUES.includes(bucket);

const isR2 = (config: FileConfig) =>
  config.driver === FileDriver.R2 || config.driver === FileDriver.R2_PRESIGNED;

const isS3 = (config: FileConfig) =>
  config.driver === FileDriver.S3 || config.driver === FileDriver.S3_PRESIGNED;

/**
 * Where a new upload for `purpose` goes. Only meaningful for the object-store
 * drivers; the local driver writes to disk and records
 * {@link StorageBucketMarker.LOCAL}.
 */
export const bucketForPurpose = (
  config: FileConfig,
  purpose: FilePurpose,
): string => {
  if (isR2(config)) {
    const bucket =
      purposeRule(purpose).visibility === FileVisibility.PUBLIC
        ? config.r2PublicBucket
        : config.r2PrivateBucket;

    if (!bucket) {
      throw new Error(`No R2 bucket configured for purpose "${purpose}"`);
    }

    return bucket;
  }

  if (isS3(config)) {
    if (!config.awsDefaultS3Bucket) {
      throw new Error('AWS_DEFAULT_S3_BUCKET is not configured');
    }

    return config.awsDefaultS3Bucket;
  }

  return StorageBucketMarker.LOCAL;
};

const extensionOf = (originalName: string) =>
  originalName.includes('.')
    ? originalName.split('.').pop()?.toLowerCase()
    : undefined;

/**
 * `<purpose prefix>/<random>.<ext>`. The name the user gave the file is never
 * part of the key — it is kept on the row (`media_file.file_name`) instead.
 */
export const buildObjectKey = (
  purpose: FilePurpose,
  originalName: string,
): string => {
  const extension = extensionOf(originalName);
  const name = extension
    ? `${randomStringGenerator()}.${extension}`
    : randomStringGenerator();

  return `${purposeRule(purpose).prefix}/${name}`;
};

/**
 * The bucket an existing row actually lives in, or `null` when it is not in
 * an object store at all (local disk, external URL).
 */
export const physicalBucketOf = (
  config: FileConfig,
  bucket: string,
): string | null => {
  if (
    bucket === StorageBucketMarker.LOCAL ||
    bucket === StorageBucketMarker.EXTERNAL
  ) {
    return null;
  }

  if (isLegacyBucket(bucket)) {
    if (isR2(config)) return config.r2Bucket ?? null;
    if (isS3(config)) return config.awsDefaultS3Bucket ?? null;

    return null;
  }

  return bucket;
};
