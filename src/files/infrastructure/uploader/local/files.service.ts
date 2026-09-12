import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FileRepository } from '../../persistence/file.repository';
import { AllConfigType } from '../../../../config/config.type';
import { FileType } from '../../../domain/file';

@Injectable()
export class FilesLocalService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly fileRepository: FileRepository,
  ) {}

  async create(file: Express.Multer.File): Promise<{ file: FileType }> {
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
        path: `/${apiPrefix}/v1/files/${file.filename}`,
      }),
    };
  }
}
