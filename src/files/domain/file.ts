import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import { Transform } from 'class-transformer';
import fileConfig from '../config/file.config';
import { FileConfig, FileDriver, R2_DRIVERS } from '../config/file-config.type';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppConfig } from '../../config/app-config.type';
import appConfig from '../../config/app.config';
import {
  buildPublicUrl,
  createR2Client,
} from '../infrastructure/uploader/r2/r2.client';

export class FileType {
  @ApiProperty({
    type: String,
    example: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae',
  })
  @Allow()
  id: string;

  @ApiProperty({
    type: String,
    example: 'https://example.com/path/to/file.jpg',
  })
  @Transform(
    ({ value }) => {
      // Values coming from an external provider (e.g. an OAuth avatar) are
      // already absolute and must not be resolved against a bucket.
      if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
        return value;
      }

      if ((fileConfig() as FileConfig).driver === FileDriver.LOCAL) {
        return (appConfig() as AppConfig).backendDomain + value;
      } else if (R2_DRIVERS.includes((fileConfig() as FileConfig).driver)) {
        const config = fileConfig() as FileConfig;

        // A public bucket / custom domain serves objects directly; without
        // one, hand out a short-lived presigned GET URL.
        const publicUrl = buildPublicUrl(config, value);
        if (publicUrl) {
          return publicUrl;
        }

        const r2 = createR2Client(config);
        const command = new GetObjectCommand({
          Bucket: config.r2Bucket ?? '',
          Key: value,
        });

        return getSignedUrl(r2, command, { expiresIn: 3600 });
      } else if (
        [FileDriver.S3_PRESIGNED, FileDriver.S3].includes(
          (fileConfig() as FileConfig).driver,
        )
      ) {
        const s3 = new S3Client({
          region: (fileConfig() as FileConfig).awsS3Region ?? '',
          credentials: {
            accessKeyId: (fileConfig() as FileConfig).accessKeyId ?? '',
            secretAccessKey: (fileConfig() as FileConfig).secretAccessKey ?? '',
          },
        });

        const command = new GetObjectCommand({
          Bucket: (fileConfig() as FileConfig).awsDefaultS3Bucket ?? '',
          Key: value,
        });

        return getSignedUrl(s3, command, { expiresIn: 3600 });
      }

      return value;
    },
    {
      toPlainOnly: true,
    },
  )
  path: string;
}
