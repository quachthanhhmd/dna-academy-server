import { Module } from '@nestjs/common';
import { LectureRatingResponseRepository } from '../lecture-rating-response.repository';
import { LectureRatingResponseRelationalRepository } from './repositories/lecture-rating-response.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LectureRatingResponseEntity } from './entities/lecture-rating-response.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LectureRatingResponseEntity])],
  providers: [
    {
      provide: LectureRatingResponseRepository,
      useClass: LectureRatingResponseRelationalRepository,
    },
  ],
  exports: [LectureRatingResponseRepository],
})
export class RelationalLectureRatingResponsePersistenceModule {}
