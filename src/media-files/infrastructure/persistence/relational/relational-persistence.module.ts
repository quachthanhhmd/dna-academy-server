import { Module } from '@nestjs/common';
import { MediaFileRepository } from '../media-file.repository';
import { MediaFileRelationalRepository } from './repositories/media-file.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaFileEntity } from './entities/media-file.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MediaFileEntity])],
  providers: [
    {
      provide: MediaFileRepository,
      useClass: MediaFileRelationalRepository,
    },
  ],
  exports: [MediaFileRepository],
})
export class RelationalMediaFilePersistenceModule {}
