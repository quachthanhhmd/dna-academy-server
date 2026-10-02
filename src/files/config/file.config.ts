import { registerAs } from '@nestjs/config';

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { FileDriver, FileConfig, R2_DRIVERS } from './file-config.type';

const isR2 = (envValues: Record<string, unknown>) =>
  R2_DRIVERS.includes(envValues.FILE_DRIVER as FileDriver);

// `env-cmd` hands an unset key through as an empty string.
const blank = (value: unknown) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '');

const DEFAULT_PRESIGNED_GET_TTL_SECONDS = 600;

class EnvironmentVariablesValidator {
  @IsEnum(FileDriver)
  FILE_DRIVER: FileDriver;

  @ValidateIf((envValues) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  ACCESS_KEY_ID: string;

  @ValidateIf((envValues) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  SECRET_ACCESS_KEY: string;

  @ValidateIf((envValues) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  AWS_DEFAULT_S3_BUCKET: string;

  @ValidateIf((envValues) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  AWS_S3_REGION: string;

  @ValidateIf(isR2)
  @IsString()
  R2_ACCOUNT_ID: string;

  @ValidateIf(isR2)
  @IsString()
  R2_ACCESS_KEY_ID: string;

  @ValidateIf(isR2)
  @IsString()
  R2_SECRET_ACCESS_KEY: string;

  // Only needed while one of the split buckets is not configured: it is what
  // the missing one falls back to.
  @ValidateIf(
    (envValues) =>
      isR2(envValues) &&
      (blank(envValues.R2_BUCKET_PUBLIC) || blank(envValues.R2_BUCKET_PRIVATE)),
  )
  @IsString()
  R2_BUCKET: string;

  @IsOptional()
  @IsString()
  R2_BUCKET_PUBLIC?: string;

  @IsOptional()
  @IsString()
  R2_BUCKET_PRIVATE?: string;

  @ValidateIf((envValues) => !blank(envValues.FILE_PRESIGNED_GET_TTL))
  @IsInt()
  @Min(60)
  @Max(3600)
  FILE_PRESIGNED_GET_TTL?: number;

  @IsOptional()
  @IsString()
  R2_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  R2_PUBLIC_URL?: string;

  @IsOptional()
  @IsString()
  FILE_LOCAL_PATH?: string;
}

const trimTrailingSlash = (value?: string) => value?.replace(/\/+$/, '');

const present = (value?: string) => (blank(value) ? undefined : value?.trim());

export default registerAs<FileConfig>('file', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    driver:
      (process.env.FILE_DRIVER as FileDriver | undefined) ?? FileDriver.LOCAL,
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    awsDefaultS3Bucket: process.env.AWS_DEFAULT_S3_BUCKET,
    awsS3Region: process.env.AWS_S3_REGION,
    r2AccountId: process.env.R2_ACCOUNT_ID,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    r2Bucket:
      present(process.env.R2_BUCKET) ?? present(process.env.R2_BUCKET_PUBLIC),
    r2PublicBucket:
      present(process.env.R2_BUCKET_PUBLIC) ?? present(process.env.R2_BUCKET),
    r2PrivateBucket:
      present(process.env.R2_BUCKET_PRIVATE) ?? present(process.env.R2_BUCKET),
    r2Endpoint:
      trimTrailingSlash(process.env.R2_ENDPOINT) ||
      (process.env.R2_ACCOUNT_ID
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : undefined),
    r2PublicUrl: trimTrailingSlash(present(process.env.R2_PUBLIC_URL)),
    presignedGetTtlSeconds: blank(process.env.FILE_PRESIGNED_GET_TTL)
      ? DEFAULT_PRESIGNED_GET_TTL_SECONDS
      : parseInt(process.env.FILE_PRESIGNED_GET_TTL as string, 10),
    localUploadPath:
      trimTrailingSlash(process.env.FILE_LOCAL_PATH) || './upload',
    maxFileSize: process.env.FILE_MAX_SIZE
      ? parseInt(process.env.FILE_MAX_SIZE, 10)
      : 26214400, // 25mb — course thumbnails and lecture PDFs
  };
});
