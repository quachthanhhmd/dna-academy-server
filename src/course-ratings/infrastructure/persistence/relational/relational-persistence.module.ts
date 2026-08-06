import { Module } from '@nestjs/common';
import { CourseRatingRepository } from '../course-rating.repository';
import { CourseRatingRelationalRepository } from './repositories/course-rating.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseRatingEntity } from './entities/course-rating.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseRatingEntity])],
  providers: [
    {
      provide: CourseRatingRepository,
      useClass: CourseRatingRelationalRepository,
    },
  ],
  exports: [CourseRatingRepository],
})
export class RelationalCourseRatingPersistenceModule {}
