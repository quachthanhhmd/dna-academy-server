export enum FileDriver {
  LOCAL = 'local',
  S3 = 's3',
  S3_PRESIGNED = 's3-presigned',
  R2 = 'r2',
  R2_PRESIGNED = 'r2-presigned',
}

export const R2_DRIVERS = [FileDriver.R2, FileDriver.R2_PRESIGNED];

export type FileConfig = {
  driver: FileDriver;
  accessKeyId?: string;
  secretAccessKey?: string;
  awsDefaultS3Bucket?: string;
  awsS3Region?: string;
  r2AccountId?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  /**
   * Bucket that rows written before the public/private split resolve
   * against (`media_file.bucket` = `legacy`, `r2`, `r2-presigned`). Taken from
   * `R2_BUCKET`, falling back to the public bucket.
   */
  r2Bucket?: string;
  /**
   * Served through `r2PublicUrl`. Course thumbnails, avatars and uploads that
   * did not name a purpose land here. `R2_BUCKET_PUBLIC`, else `R2_BUCKET`.
   */
  r2PublicBucket?: string;
  /**
   * Never exposed; read only through short-lived presigned GETs. Lecture
   * documents and quiz submissions land here. `R2_BUCKET_PRIVATE`, else
   * `R2_BUCKET`.
   */
  r2PrivateBucket?: string;
  /**
   * S3 API endpoint. Derived from the account id when not set explicitly.
   */
  r2Endpoint?: string;
  /**
   * Public base URL of the public bucket (custom domain, or r2.dev for
   * testing). Only objects stored in `r2PublicBucket` with public visibility
   * are served from it; everything else gets a presigned GET URL.
   */
  r2PublicUrl?: string;
  /**
   * Lifetime of a presigned GET URL, in seconds. Kept short: these URLs are
   * handed to whoever passed the access check, and cannot be revoked.
   */
  presignedGetTtlSeconds: number;
  /**
   * Destination directory for the `local` driver, relative to the working
   * directory. Created on boot if missing.
   */
  localUploadPath: string;
  maxFileSize: number;
};
