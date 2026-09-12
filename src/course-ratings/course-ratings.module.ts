import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CourseRatingsService } from './course-ratings.service';
import { CourseRatingsController } from './course-ratings.controller';
import { RelationalCourseRatingPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // PermissionGuard is applied via @UseGuards on this module's controller,
    // so Nest builds it here and needs its own dependencies in scope.
    AuthorizationModule,
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
