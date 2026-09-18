import { CoursesModule } from '../courses/courses.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CourseTargetLearnersService } from './course-target-learners.service';
import { RelationalCourseTargetLearnerPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CoursesModule,

    // do not remove this comment
    RelationalCourseTargetLearnerPersistenceModule,
  ],
  providers: [CourseTargetLearnersService],
  exports: [
    CourseTargetLearnersService,
    RelationalCourseTargetLearnerPersistenceModule,
  ],
})
export class CourseTargetLearnersModule {}
