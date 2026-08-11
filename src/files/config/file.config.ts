import { registerAs } from '@nestjs/config';

import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { FileDriver, FileConfig, R2_DRIVERS } from './file-config.type';

const isR2 = (envValues: Record<string, unknown>) =>
  R2_DRIVERS.includes(envValues.FILE_DRIVER as FileDriver);

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

  @ValidateIf(isR2)
  @IsString()
  R2_BUCKET: string;

  @IsOptional()
  @IsString()
  R2_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  R2_PUBLIC_URL?: string;
}

const trimTrailingSlash = (value?: string) => value?.replace(/\/+$/, '');

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
    r2Bucket: process.env.R2_BUCKET,
    r2Endpoint:
      trimTrailingSlash(process.env.R2_ENDPOINT) ||
      (process.env.R2_ACCOUNT_ID
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : undefined),
    r2PublicUrl: trimTrailingSlash(process.env.R2_PUBLIC_URL),
    maxFileSize: process.env.FILE_MAX_SIZE
      ? parseInt(process.env.FILE_MAX_SIZE, 10)
      : 26214400, // 25mb — course thumbnails and lecture PDFs
  };
});
