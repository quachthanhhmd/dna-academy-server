import { CourseAccessModule } from '../course-access/course-access.module';
import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { MasterDataCodesModule } from '../master-data-codes/master-data-codes.module';
import { CourseInstructorsModule } from '../course-instructors/course-instructors.module';
import { InstructorsModule } from '../instructors/instructors.module';
import { InstructorsAdminModule } from '../instructors-admin/instructors-admin.module';
import { YoutubeModule } from '../youtube/youtube.module';
import { SectionsModule } from '../sections/sections.module';
import { LecturesModule } from '../lectures/lectures.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { CourseLearningOutcomesModule } from '../course-learning-outcomes/course-learning-outcomes.module';
import { CourseRequirementsModule } from '../course-requirements/course-requirements.module';
import { CourseTargetLearnersModule } from '../course-target-learners/course-target-learners.module';
import { CourseGroupAssignmentsModule } from '../course-group-assignments/course-group-assignments.module';
import { LectureContentVideosModule } from '../lecture-content-videos/lecture-content-videos.module';
import { LectureContentArticlesModule } from '../lecture-content-articles/lecture-content-articles.module';
import { LectureContentDocumentsModule } from '../lecture-content-documents/lecture-content-documents.module';
import { LectureContentQuizzesModule } from '../lecture-content-quizzes/lecture-content-quizzes.module';
import { QuizQuestionsModule } from '../quiz-questions/quiz-questions.module';
import { QuizAnswerOptionsModule } from '../quiz-answer-options/quiz-answer-options.module';
import { LectureContentReflectionsModule } from '../lecture-content-reflections/lecture-content-reflections.module';
import { ReflectionQuestionsModule } from '../reflection-questions/reflection-questions.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CoursesAdminController } from './courses-admin.controller';
import { CoursesAdminService } from './courses-admin.service';
import { CourseInstructorsAdminService } from './course-instructors-admin.service';
import { CourseDetailService } from './course-detail.service';
import { CourseListsAdminService } from './course-lists-admin.service';
import { CourseGroupsAdminService } from './course-groups-admin.service';
import { CoursePublishAdminService } from './course-publish-admin.service';
import { CourseAggregatesService } from './course-aggregates.service';
import { SectionsAdminController } from './sections-admin.controller';
import { SectionsAdminService } from './sections-admin.service';
import { LecturesAdminController } from './lectures-admin.controller';
import { LectureMoveAdminController } from './lecture-move-admin.controller';
import { LecturesAdminService } from './lectures-admin.service';
import { LectureContentAdminController } from './lecture-content-admin.controller';
import { LectureContentAdminService } from './lecture-content-admin.service';

@Module({
  imports: [
    CoursesModule,
    MasterDataCodesModule,
    CourseInstructorsModule,
    InstructorsModule,
    InstructorsAdminModule,
    YoutubeModule,
    SectionsModule,
    LecturesModule,
    // The lecture delete path releases the Continue Learning pointer, which
    // also references the lecture.
    EnrollmentsModule,
    CourseLearningOutcomesModule,
    CourseRequirementsModule,
    CourseTargetLearnersModule,
    CourseGroupAssignmentsModule,
    LectureContentVideosModule,
    LectureContentArticlesModule,
    LectureContentDocumentsModule,
    LectureContentQuizzesModule,
    QuizQuestionsModule,
    QuizAnswerOptionsModule,
    LectureContentReflectionsModule,
    ReflectionQuestionsModule,
    AuthorizationModule,
    CourseAccessModule,
  ],
  controllers: [
    CoursesAdminController,
    SectionsAdminController,
    LecturesAdminController,
    LectureMoveAdminController,
    LectureContentAdminController,
  ],
  providers: [
    CoursesAdminService,
    CourseInstructorsAdminService,
    CourseDetailService,
    CourseListsAdminService,
    CourseGroupsAdminService,
    CoursePublishAdminService,
    CourseAggregatesService,
    SectionsAdminService,
    LecturesAdminService,
    LectureContentAdminService,
  ],
  exports: [
    CoursesAdminService,
    CourseInstructorsAdminService,
    CourseDetailService,
    CourseListsAdminService,
    CourseGroupsAdminService,
    CoursePublishAdminService,
    CourseAggregatesService,
    SectionsAdminService,
    LecturesAdminService,
    LectureContentAdminService,
  ],
})
export class CoursesAdminModule {}
