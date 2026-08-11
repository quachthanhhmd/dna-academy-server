import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FilesR2PresignedController } from './files.controller';
import { FilesR2PresignedService } from './files.service';
import { RelationalFilePersistenceModule } from '../../persistence/relational/relational-persistence.module';

@Module({
  imports: [RelationalFilePersistenceModule, ConfigModule],
  controllers: [FilesR2PresignedController],
  providers: [FilesR2PresignedService],
  exports: [FilesR2PresignedService],
})
export class FilesR2PresignedModule {}
