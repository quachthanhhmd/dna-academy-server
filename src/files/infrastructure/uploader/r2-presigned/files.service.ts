import {
  HttpStatus,
  Injectable,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

import { FileRepository } from '../../persistence/file.repository';
import { FileUploadDto } from './dto/file.dto';
import { FileType } from '../../../domain/file';
import { AllConfigType } from '../../../../config/config.type';
import { FileConfig } from '../../../config/file-config.type';
import { ALLOWED_FILE_EXTENSIONS, createR2Client } from '../r2/r2.client';
import { UploadOptions } from '../file-uploader.service';
import {
  bucketForPurpose,
  buildObjectKey,
} from '../../../storage/storage-location';
import { visibilityOf } from '../../../storage/upload-purpose';

@Injectable()
export class FilesR2PresignedService {
  private readonly r2: S3Client;
  private readonly fileConfig: FileConfig;

  constructor(
    private readonly fileRepository: FileRepository,
    configService: ConfigService<AllConfigType>,
  ) {
    this.fileConfig = configService.getOrThrow('file', { infer: true });
    this.r2 = createR2Client(this.fileConfig);
  }

  async create(
    file: FileUploadDto,
    options: UploadOptions,
  ): Promise<{ file: FileType; uploadSignedUrl: string }> {
    if (!file) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'selectFile',
        },
      });
    }

    if (!file.fileName.match(ALLOWED_FILE_EXTENSIONS)) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: `cantUploadFileType`,
        },
      });
    }

    if (file.fileSize > this.fileConfig.maxFileSize) {
      throw new PayloadTooLargeException({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        error: 'Payload Too Large',
        message: 'File too large',
      });
    }

    const key = buildObjectKey(options.purpose, file.fileName);
    const bucket = bucketForPurpose(this.fileConfig, options.purpose);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentLength: file.fileSize,
      ContentType: file.contentType,
    });
    const uploadSignedUrl = await getSignedUrl(this.r2, command, {
      expiresIn: 3600,
    });

    return {
      file: await this.fileRepository.create({
        objectKey: key,
        bucket,
        visibility: visibilityOf(options.purpose),
        purpose: options.purpose,
        fileName: file.fileName,
        mimeType: file.contentType ?? null,
        sizeBytes: file.fileSize,
        uploadedById: options.uploadedById,
      }),
      uploadSignedUrl,
    };
  }
}
