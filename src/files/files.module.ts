import {
  // common
  Module,
} from '@nestjs/common';

import { RelationalFilePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { FilesService } from './files.service';
import fileConfig from './config/file.config';
import { FileConfig, FileDriver } from './config/file-config.type';
import { FilesLocalModule } from './infrastructure/uploader/local/files.module';
import { FilesS3Module } from './infrastructure/uploader/s3/files.module';
import { FilesS3PresignedModule } from './infrastructure/uploader/s3-presigned/files.module';
import { FilesR2Module } from './infrastructure/uploader/r2/files.module';
import { FilesR2PresignedModule } from './infrastructure/uploader/r2-presigned/files.module';

const uploaderModules = {
  [FileDriver.LOCAL]: FilesLocalModule,
  [FileDriver.S3]: FilesS3Module,
  [FileDriver.S3_PRESIGNED]: FilesS3PresignedModule,
  [FileDriver.R2]: FilesR2Module,
  [FileDriver.R2_PRESIGNED]: FilesR2PresignedModule,
};

const infrastructureUploaderModule =
  uploaderModules[(fileConfig() as FileConfig).driver];

@Module({
  imports: [
    // import modules, etc.
    RelationalFilePersistenceModule,
    infrastructureUploaderModule,
  ],
  providers: [FilesService],
  exports: [FilesService, RelationalFilePersistenceModule],
})
export class FilesModule {}
