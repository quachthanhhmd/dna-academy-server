import { Module } from '@nestjs/common';
import { LectureContentVideoRepository } from '../lecture-content-video.repository';
import { LectureContentVideoRelationalRepository } from './repositories/lecture-content-video.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LectureContentVideoEntity } from './entities/lecture-content-video.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LectureContentVideoEntity])],
  providers: [
    {
      provide: LectureContentVideoRepository,
      useClass: LectureContentVideoRelationalRepository,
    },
  ],
  exports: [LectureContentVideoRepository],
})
export class RelationalLectureContentVideoPersistenceModule {}
