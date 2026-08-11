import {
  HttpStatus,
  Module,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import multerS3 from 'multer-s3';

import { FilesR2Controller } from './files.controller';
import { FilesR2Service } from './files.service';
import {
  ALLOWED_FILE_EXTENSIONS,
  buildObjectKey,
  createR2Client,
} from './r2.client';

import { RelationalFilePersistenceModule } from '../../persistence/relational/relational-persistence.module';
import { AllConfigType } from '../../../../config/config.type';

@Module({
  imports: [
    RelationalFilePersistenceModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const fileConfig = configService.getOrThrow('file', { infer: true });
        const r2 = createR2Client(fileConfig);

        return {
          fileFilter: (request, file, callback) => {
            if (!file.originalname.match(ALLOWED_FILE_EXTENSIONS)) {
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
          storage: multerS3({
            s3: r2,
            bucket: fileConfig.r2Bucket ?? '',
            contentType: multerS3.AUTO_CONTENT_TYPE,
            key: (request, file, callback) => {
              callback(null, buildObjectKey(file.originalname));
            },
          }),
          limits: {
            fileSize: fileConfig.maxFileSize,
          },
        };
      },
    }),
  ],
  controllers: [FilesR2Controller],
  providers: [FilesR2Service],
  exports: [FilesR2Service],
})
export class FilesR2Module {}
