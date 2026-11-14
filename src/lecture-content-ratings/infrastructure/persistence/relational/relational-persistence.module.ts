import { Module } from '@nestjs/common';
import { LectureContentRatingRepository } from '../lecture-content-rating.repository';
import { LectureContentRatingRelationalRepository } from './repositories/lecture-content-rating.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LectureContentRatingEntity } from './entities/lecture-content-rating.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LectureContentRatingEntity])],
  providers: [
    {
      provide: LectureContentRatingRepository,
      useClass: LectureContentRatingRelationalRepository,
    },
  ],
  exports: [LectureContentRatingRepository],
})
export class RelationalLectureContentRatingPersistenceModule {}
