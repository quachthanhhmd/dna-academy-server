import { MasterDataCodesModule } from '../master-data-codes/master-data-codes.module';
import { CoursesModule } from '../courses/courses.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CourseGroupAssignmentsService } from './course-group-assignments.service';
import { CourseGroupAssignmentsController } from './course-group-assignments.controller';
import { RelationalCourseGroupAssignmentPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    MasterDataCodesModule,

    CoursesModule,

    // do not remove this comment
    RelationalCourseGroupAssignmentPersistenceModule,
  ],
  controllers: [CourseGroupAssignmentsController],
  providers: [CourseGroupAssignmentsService],
  exports: [
    CourseGroupAssignmentsService,
    RelationalCourseGroupAssignmentPersistenceModule,
  ],
})
export class CourseGroupAssignmentsModule {}
