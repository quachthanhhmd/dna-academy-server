import {
  HttpStatus,
  Module,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FilesLocalController } from './files.controller';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import fs from 'node:fs';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';

import { FilesLocalService } from './files.service';
import { FileUploaderService } from '../file-uploader.service';

import { RelationalFilePersistenceModule } from '../../persistence/relational/relational-persistence.module';
import { AllConfigType } from '../../../../config/config.type';

@Module({
  imports: [
    RelationalFilePersistenceModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const destination = configService.getOrThrow('file.localUploadPath', {
          infer: true,
        });

        // The upload directory is gitignored/dockerignored, so it is absent in
        // a fresh container. multer does not create it and would fail every
        // upload with ENOENT, so make sure it exists before serving traffic.
        fs.mkdirSync(destination, { recursive: true });

        return {
          fileFilter: (request, file, callback) => {
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
              return callback(
                new UnprocessableEntityException({
                  status: HttpStatus.UNPROCESSABLE_ENTITY,
                  errors: {
                    file: `cantUploadFileType`,
                  },
                }),
                false,
              );
            }

            callback(null, true);
          },
          storage: diskStorage({
            destination,
            filename: (request, file, callback) => {
              callback(
                null,
                `${randomStringGenerator()}.${file.originalname
                  .split('.')
                  .pop()
                  ?.toLowerCase()}`,
              );
            },
          }),
          limits: {
            fileSize: configService.get('file.maxFileSize', { infer: true }),
          },
        };
      },
    }),
  ],
  controllers: [FilesLocalController],
  providers: [
    ConfigModule,
    ConfigService,
    FilesLocalService,
    // Lets a feature module upload through whichever driver is active.
    { provide: FileUploaderService, useExisting: FilesLocalService },
  ],
  // MulterModule carries this driver's multer options, which any
  // consumer's FileInterceptor needs in scope to store the bytes.
  exports: [FilesLocalService, FileUploaderService, MulterModule],
})
export class FilesLocalModule {}
