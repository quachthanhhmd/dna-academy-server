import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CourseRatingsService } from './course-ratings.service';
import { CourseRatingsController } from './course-ratings.controller';
import { RelationalCourseRatingPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CoursesModule,

    UsersModule,

    EnrollmentsModule,

    // do not remove this comment
    RelationalCourseRatingPersistenceModule,
  ],
  controllers: [CourseRatingsController],
  providers: [CourseRatingsService],
  exports: [CourseRatingsService, RelationalCourseRatingPersistenceModule],
})
export class CourseRatingsModule {}
