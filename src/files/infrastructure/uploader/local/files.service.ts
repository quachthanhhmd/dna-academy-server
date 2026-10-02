import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FileRepository } from '../../persistence/file.repository';
import { AllConfigType } from '../../../../config/config.type';
import { FileType } from '../../../domain/file';
import { UploadOptions } from '../file-uploader.service';
import { StorageBucketMarker } from '../../../storage/storage-location';
import { visibilityOf } from '../../../storage/upload-purpose';

@Injectable()
export class FilesLocalService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly fileRepository: FileRepository,
  ) {}

  async create(
    file: Express.Multer.File,
    options: UploadOptions,
  ): Promise<{ file: FileType }> {
    if (!file) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'selectFile',
        },
      });
    }

    const apiPrefix = this.configService.get('app.apiPrefix', { infer: true });

    return {
      file: await this.fileRepository.create({
        // Built from the download route, not from file.path — the on-disk
        // directory is configurable (FILE_LOCAL_PATH) while this URL must keep
        // matching GET /:apiPrefix/v1/files/:path.
        objectKey: `/${apiPrefix}/v1/files/${file.filename}`,
        bucket: StorageBucketMarker.LOCAL,
        // Recorded for when these rows move to an object store; the local
        // download route itself serves every file to anyone with the URL.
        visibility: visibilityOf(options.purpose),
        purpose: options.purpose,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedById: options.uploadedById,
      }),
    };
  }
}
