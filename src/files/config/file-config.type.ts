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
  r2Bucket?: string;
  /**
   * S3 API endpoint. Derived from the account id when not set explicitly.
   */
  r2Endpoint?: string;
  /**
   * Public base URL of the bucket (r2.dev subdomain or a custom domain).
   * When set, stored objects are served from it directly; otherwise the API
   * hands out short-lived presigned GET URLs.
   */
  r2PublicUrl?: string;
  /**
   * Destination directory for the `local` driver, relative to the working
   * directory. Created on boot if missing.
   */
  localUploadPath: string;
  maxFileSize: number;
};
