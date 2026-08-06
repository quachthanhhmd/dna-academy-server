import { Module } from '@nestjs/common';
import { LectureContentDocumentRepository } from '../lecture-content-document.repository';
import { LectureContentDocumentRelationalRepository } from './repositories/lecture-content-document.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LectureContentDocumentEntity } from './entities/lecture-content-document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LectureContentDocumentEntity])],
  providers: [
    {
      provide: LectureContentDocumentRepository,
      useClass: LectureContentDocumentRelationalRepository,
    },
  ],
  exports: [LectureContentDocumentRepository],
})
export class RelationalLectureContentDocumentPersistenceModule {}
