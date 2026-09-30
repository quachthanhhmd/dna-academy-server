import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaFileEntity } from '../../../../media-files/infrastructure/persistence/relational/entities/media-file.entity';
import { FileRepository } from '../file.repository';
import { FileRelationalRepository } from './repositories/file.repository';

@Module({
  imports: [TypeOrmModule.forFeature([MediaFileEntity])],
  providers: [
    {
      provide: FileRepository,
      useClass: FileRelationalRepository,
    },
  ],
  exports: [FileRepository],
})
export class RelationalFilePersistenceModule {}
