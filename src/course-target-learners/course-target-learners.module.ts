import { CoursesModule } from '../courses/courses.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CourseTargetLearnersService } from './course-target-learners.service';
import { CourseTargetLearnersController } from './course-target-learners.controller';
import { RelationalCourseTargetLearnerPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CoursesModule,

    // do not remove this comment
    RelationalCourseTargetLearnerPersistenceModule,
  ],
  controllers: [CourseTargetLearnersController],
  providers: [CourseTargetLearnersService],
  exports: [
    CourseTargetLearnersService,
    RelationalCourseTargetLearnerPersistenceModule,
  ],
})
export class CourseTargetLearnersModule {}
