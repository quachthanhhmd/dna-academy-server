import { CourseAccessModule } from '../course-access/course-access.module';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CoursesModule } from '../courses/courses.module';
import { SectionsModule } from '../sections/sections.module';
import { LecturesModule } from '../lectures/lectures.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { LectureProgressesModule } from '../lecture-progresses/lecture-progresses.module';
import { LectureContentVideosModule } from '../lecture-content-videos/lecture-content-videos.module';
import { LectureContentArticlesModule } from '../lecture-content-articles/lecture-content-articles.module';
import { LectureContentDocumentsModule } from '../lecture-content-documents/lecture-content-documents.module';
import { LectureContentQuizzesModule } from '../lecture-content-quizzes/lecture-content-quizzes.module';
import { LectureContentReflectionsModule } from '../lecture-content-reflections/lecture-content-reflections.module';
import { QuizQuestionsModule } from '../quiz-questions/quiz-questions.module';
import { QuizAnswerOptionsModule } from '../quiz-answer-options/quiz-answer-options.module';
import { QuizAttemptsModule } from '../quiz-attempts/quiz-attempts.module';
import { QuizAttemptAnswersModule } from '../quiz-attempt-answers/quiz-attempt-answers.module';
import { QuizSavesModule } from '../quiz-saves/quiz-saves.module';
import { MediaFilesModule } from '../media-files/media-files.module';
import { CourseGroupAssignmentsModule } from '../course-group-assignments/course-group-assignments.module';
import { CertificateVerificationController } from './certificate-verification.controller';
import { LearningAdminController } from './learning-admin.controller';
import { EnrollmentResetService } from './services/enrollment-reset.service';
import { CertificateVerificationService } from './services/certificate-verification.service';
import { RateLimitGuard } from '../utils/rate-limit/rate-limit.guard';
import { ReflectionQuestionsModule } from '../reflection-questions/reflection-questions.module';
import { ReflectionResponsesModule } from '../reflection-responses/reflection-responses.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { CourseRatingsModule } from '../course-ratings/course-ratings.module';
import { CareerReflectionQuestionsModule } from '../career-reflection-questions/career-reflection-questions.module';
import { CareerReflectionAnswersModule } from '../career-reflection-answers/career-reflection-answers.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { FilesModule } from '../files/files.module';

import { LearningPlayerController } from './learning.controller';
import { LearningQuizController } from './learning-quiz.controller';
import { LearningCompletionController } from './learning-completion.controller';

import { CourseCurriculumService } from './services/course-curriculum.service';
import { SequentialLockService } from './services/sequential-lock.service';
import { CompletionDetectorService } from './services/completion-detector.service';
import { CertificateGeneratorService } from './services/certificate-generator.service';
import { QuizGraderService } from './services/quiz-grader.service';
import { LectureContentService } from './services/lecture-content.service';
import { EnrollmentResolverService } from './services/enrollment-resolver.service';
import { PlayerService } from './services/player.service';
import { ProgressService } from './services/progress.service';
import { QuizService } from './services/quiz.service';
import { QuizFileUploadService } from './services/quiz-file-upload.service';
import { ReflectionService } from './services/reflection.service';
import { CompletionService } from './services/completion.service';
import { CareerReflectionService } from './services/career-reflection.service';
import { PdfModule } from '../pdf/pdf.module';
import { CertificatePdfService } from './services/certificate-pdf.service';

/**
 * Epic 4 v2 §2.3–§2.4 — the student learning flow: player navigation,
 * progress, quiz, reflection, completion, certificate and rating.
 */
@Module({
  imports: [
    // Quiz answer uploads are registered as media_file rows.
    MediaFilesModule,
    // Epic 4.1 D6 — the completion screen's Explore Pathway card.
    CourseGroupAssignmentsModule,
    // OnboardingGuard is applied via @UseGuards on this module's controllers,
    // so Nest builds it in this injector and needs UsersService in scope.
    AuthModule,
    UsersModule,
    CoursesModule,
    SectionsModule,
    LecturesModule,
    EnrollmentsModule,
    LectureProgressesModule,
    LectureContentVideosModule,
    LectureContentArticlesModule,
    LectureContentDocumentsModule,
    LectureContentQuizzesModule,
    LectureContentReflectionsModule,
    QuizQuestionsModule,
    QuizAnswerOptionsModule,
    QuizAttemptsModule,
    QuizAttemptAnswersModule,
    QuizSavesModule,
    ReflectionQuestionsModule,
    ReflectionResponsesModule,
    CertificatesModule,
    CourseRatingsModule,
    CareerReflectionQuestionsModule,
    CareerReflectionAnswersModule,
    // PermissionGuard on the admin certificate-regenerate route is built in
    // this injector, so its own dependencies must be visible here.
    AuthorizationModule,
    // Admin learner-record routes check the caller teaches the course.
    CourseAccessModule,
    // Brings FileUploaderService and the active driver's multer options
    // into scope for the quiz answer upload.
    FilesModule,
    // Epic 4.6 — the certificate download shares the dashboard's Chromium.
    PdfModule,
  ],
  controllers: [
    LearningPlayerController,
    LearningQuizController,
    LearningCompletionController,
    CertificateVerificationController,
    LearningAdminController,
  ],
  providers: [
    CourseCurriculumService,
    SequentialLockService,
    CompletionDetectorService,
    CertificateGeneratorService,
    QuizGraderService,
    LectureContentService,
    EnrollmentResolverService,
    PlayerService,
    ProgressService,
    QuizService,
    QuizFileUploadService,
    ReflectionService,
    CompletionService,
    CareerReflectionService,
    CertificateVerificationService,
    EnrollmentResetService,
    CertificatePdfService,
    // Applied via @UseGuards on the verification controller, so Nest builds it
    // in this injector.
    RateLimitGuard,
  ],
  exports: [
    CourseCurriculumService,
    CompletionDetectorService,
    SequentialLockService,
  ],
})
export class LearningModule {}
