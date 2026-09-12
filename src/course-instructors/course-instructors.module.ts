import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CourseInstructorsService } from './course-instructors.service';
import { RelationalCourseInstructorPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalCourseInstructorPersistenceModule,
  ],
  providers: [CourseInstructorsService],
  exports: [
    CourseInstructorsService,
    RelationalCourseInstructorPersistenceModule,
  ],
})
export class CourseInstructorsModule {}
