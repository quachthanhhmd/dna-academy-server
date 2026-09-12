import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CoursesModule } from '../courses/courses.module';
import { SectionsModule } from '../sections/sections.module';
import { LecturesModule } from '../lectures/lectures.module';
import { CourseLearningOutcomesModule } from '../course-learning-outcomes/course-learning-outcomes.module';
import { CourseRequirementsModule } from '../course-requirements/course-requirements.module';
import { CourseTargetLearnersModule } from '../course-target-learners/course-target-learners.module';
import { CourseGroupAssignmentsModule } from '../course-group-assignments/course-group-assignments.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { CourseInstructorsModule } from '../course-instructors/course-instructors.module';
import { InstructorsModule } from '../instructors/instructors.module';
import { CourseCatalogController } from './course-catalog.controller';
import {
  StudentCoursesController,
  StudentStatsController,
} from './student-courses.controller';
import { CourseCatalogService } from './course-catalog.service';
import { CourseOverviewService } from './course-overview.service';
import { QuizAttemptsModule } from '../quiz-attempts/quiz-attempts.module';
import { CourseEnrollmentService } from './course-enrollment.service';
import { LectureProgressesModule } from '../lecture-progresses/lecture-progresses.module';
import { SequentialLockService } from '../learning/services/sequential-lock.service';

@Module({
  imports: [
    AuthModule,
    // OnboardingGuard is applied via @UseGuards on this module's controllers,
    // so Nest builds it in this injector and needs UsersService in scope here.
    UsersModule,
    CoursesModule,
    SectionsModule,
    LecturesModule,
    CourseLearningOutcomesModule,
    CourseRequirementsModule,
    CourseTargetLearnersModule,
    CourseGroupAssignmentsModule,
    EnrollmentsModule,
    // My Courses surfaces certificateId on completed enrollments.
    CertificatesModule,
    CourseInstructorsModule,
    InstructorsModule,
    // v2.2 — the overview returns each lecture's progress and lock state.
    QuizAttemptsModule,
    LectureProgressesModule,
  ],
  controllers: [
    CourseCatalogController,
    StudentCoursesController,
    StudentStatsController,
  ],
  providers: [
    CourseCatalogService,
    CourseOverviewService,
    CourseEnrollmentService,
    // Pure evaluator with no dependencies of its own; provided here rather
    // than importing LearningModule, which imports this module.
    SequentialLockService,
  ],
  exports: [
    CourseCatalogService,
    CourseOverviewService,
    CourseEnrollmentService,
  ],
})
export class CourseCatalogModule {}
