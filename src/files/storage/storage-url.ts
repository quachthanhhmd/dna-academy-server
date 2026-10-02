import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileConfig, FileDriver } from '../config/file-config.type';
import { createR2Client } from '../infrastructure/uploader/r2/r2.client';
import { FileVisibility } from './file-purpose';
import {
  StorageBucketMarker,
  isLegacyBucket,
  physicalBucketOf,
} from './storage-location';

/**
 * What it takes to turn a stored file into a URL. `bucket` and `visibility`
 * are absent only on values that predate them; those resolve the way every
 * file did before — public, in the driver's configured bucket.
 */
export type StoredFileRef = {
  objectKey: string;
  bucket?: string | null;
  visibility?: string | null;
};

/**
 * The ref for a `FileType`, whose `path` holds the object key until it is
 * serialized.
 */
export const fileRefOf = (file: {
  path: string;
  bucket?: string | null;
  visibility?: string | null;
}): StoredFileRef => ({
  objectKey: file.path,
  bucket: file.bucket,
  visibility: file.visibility,
});

export type PresignGet = (
  bucket: string,
  key: string,
  ttlSeconds: number,
) => Promise<string>;

const ABSOLUTE_URL = /^https?:\/\//i;

/**
 * The URL for `ref` when it can be given without signing anything — and so
 * never expires. `null` means only a presigned URL will do.
 */
export const stableUrlOf = (
  config: FileConfig,
  backendDomain: string,
  ref: StoredFileRef,
): string | null => {
  const bucket = ref.bucket || StorageBucketMarker.LEGACY;

  if (
    bucket === StorageBucketMarker.EXTERNAL ||
    ABSOLUTE_URL.test(ref.objectKey)
  ) {
    return ref.objectKey;
  }

  if (
    bucket === StorageBucketMarker.LOCAL ||
    (isLegacyBucket(bucket) && config.driver === FileDriver.LOCAL)
  ) {
    return backendDomain + ref.objectKey;
  }

  const visibility = ref.visibility || FileVisibility.PUBLIC;
  const physicalBucket = physicalBucketOf(config, bucket);

  // Only the public bucket sits behind the public domain. A public row that
  // lives anywhere else (a legacy row in a bucket that is not the public
  // one) would 404 there, so it is signed instead.
  if (
    visibility === FileVisibility.PUBLIC &&
    config.r2PublicUrl &&
    physicalBucket !== null &&
    physicalBucket === config.r2PublicBucket
  ) {
    return `${config.r2PublicUrl}/${ref.objectKey}`;
  }

  return null;
};

/**
 * The URL a client should use to read `ref` right now: the stable URL when
 * there is one, otherwise a presigned GET valid for
 * `config.presignedGetTtlSeconds`.
 */
export const resolveFileUrl = async (
  config: FileConfig,
  backendDomain: string,
  presign: PresignGet,
  ref: StoredFileRef,
): Promise<string> => {
  const stable = stableUrlOf(config, backendDomain, ref);
  if (stable !== null) {
    return stable;
  }

  const physicalBucket = physicalBucketOf(
    config,
    ref.bucket || StorageBucketMarker.LEGACY,
  );

  if (!physicalBucket) {
    throw new Error(
      `Cannot resolve a URL for "${ref.objectKey}": no bucket for "${ref.bucket}" under FILE_DRIVER=${config.driver}`,
    );
  }

  return presign(physicalBucket, ref.objectKey, config.presignedGetTtlSeconds);
};

const createObjectStoreClient = (config: FileConfig): S3Client =>
  config.driver === FileDriver.R2 || config.driver === FileDriver.R2_PRESIGNED
    ? createR2Client(config)
    : new S3Client({
        region: config.awsS3Region ?? '',
        credentials: {
          accessKeyId: config.accessKeyId ?? '',
          secretAccessKey: config.secretAccessKey ?? '',
        },
      });

/**
 * Presigns with one client per set of credentials, rather than building a new
 * client for every URL.
 */
export const createPresignGet = (): ((config: FileConfig) => PresignGet) => {
  const clients = new Map<string, S3Client>();

  return (config) => async (bucket, key, ttlSeconds) => {
    const cacheKey = [
      config.driver,
      config.r2Endpoint,
      config.r2AccessKeyId,
      config.awsS3Region,
      config.accessKeyId,
    ].join('|');

    let client = clients.get(cacheKey);
    if (!client) {
      client = createObjectStoreClient(config);
      clients.set(cacheKey, client);
    }

    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
  };
};
