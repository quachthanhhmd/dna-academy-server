import { CoursesModule } from '../courses/courses.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CourseRequirementsService } from './course-requirements.service';
import { CourseRequirementsController } from './course-requirements.controller';
import { RelationalCourseRequirementPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CoursesModule,

    // do not remove this comment
    RelationalCourseRequirementPersistenceModule,
  ],
  controllers: [CourseRequirementsController],
  providers: [CourseRequirementsService],
  exports: [
    CourseRequirementsService,
    RelationalCourseRequirementPersistenceModule,
  ],
})
export class CourseRequirementsModule {}
