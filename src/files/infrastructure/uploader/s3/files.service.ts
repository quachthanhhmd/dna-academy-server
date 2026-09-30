import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FileRepository } from '../../persistence/file.repository';
import { FileType } from '../../../domain/file';
import { UploadOptions } from '../file-uploader.service';
import { visibilityOf } from '../../../storage/upload-purpose';

@Injectable()
export class FilesS3Service {
  constructor(private readonly fileRepository: FileRepository) {}

  async create(
    file: Express.MulterS3.File,
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

    return {
      file: await this.fileRepository.create({
        objectKey: file.key,
        bucket: file.bucket,
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
