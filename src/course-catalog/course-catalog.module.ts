import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CoursesModule } from '../courses/courses.module';
import { SectionsModule } from '../sections/sections.module';
import { LecturesModule } from '../lectures/lectures.module';
import { CourseLearningOutcomesModule } from '../course-learning-outcomes/course-learning-outcomes.module';
import { CourseRequirementsModule } from '../course-requirements/course-requirements.module';
import { CourseTargetLearnersModule } from '../course-target-learners/course-target-learners.module';
import { CourseGroupAssignmentsModule } from '../course-group-assignments/course-group-assignments.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { CourseCatalogController } from './course-catalog.controller';
import { StudentCoursesController } from './student-courses.controller';
import { CourseCatalogService } from './course-catalog.service';
import { CourseOverviewService } from './course-overview.service';
import { CourseEnrollmentService } from './course-enrollment.service';

@Module({
  imports: [
    AuthModule,
    CoursesModule,
    SectionsModule,
    LecturesModule,
    CourseLearningOutcomesModule,
    CourseRequirementsModule,
    CourseTargetLearnersModule,
    CourseGroupAssignmentsModule,
    EnrollmentsModule,
  ],
  controllers: [CourseCatalogController, StudentCoursesController],
  providers: [
    CourseCatalogService,
    CourseOverviewService,
    CourseEnrollmentService,
  ],
  exports: [
    CourseCatalogService,
    CourseOverviewService,
    CourseEnrollmentService,
  ],
})
export class CourseCatalogModule {}
