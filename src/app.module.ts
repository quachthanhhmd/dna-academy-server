import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './database/config/database.config';
import { envFilePaths } from './config/env-files';
import authConfig from './auth/config/auth.config';
import appConfig from './config/app.config';
import mailConfig from './mail/config/mail.config';
import fileConfig from './files/config/file.config';
import facebookConfig from './auth-facebook/config/facebook.config';
import googleConfig from './auth-google/config/google.config';
import learningConfig from './learning/config/learning.config';
import certificateConfig from './certificates/config/certificate.config';
import path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthFacebookModule } from './auth-facebook/auth-facebook.module';
import { AuthGoogleModule } from './auth-google/auth-google.module';
import { HeaderResolver, I18nModule } from 'nestjs-i18n';
import { TypeOrmConfigService } from './database/typeorm-config.service';
import { MailModule } from './mail/mail.module';
import { HomeModule } from './home/home.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AllConfigType } from './config/config.type';
import { SessionModule } from './session/session.module';
import { MailerModule } from './mailer/mailer.module';

const infrastructureDatabaseModule = TypeOrmModule.forRootAsync({
  useClass: TypeOrmConfigService,
  dataSourceFactory: async (options?: DataSourceOptions) => {
    if (!options) {
      throw new Error('TypeORM data source options are required');
    }
    return new DataSource(options).initialize();
  },
});

import { ModulesModule } from './modules/modules.module';

import { PermissionsModule } from './permissions/permissions.module';

import { RolePermissionsModule } from './role-permissions/role-permissions.module';

import { UserRolesModule } from './user-roles/user-roles.module';

import { MasterDataGroupsModule } from './master-data-groups/master-data-groups.module';

import { MasterDataCodesModule } from './master-data-codes/master-data-codes.module';

import { OauthAccountsModule } from './oauth-accounts/oauth-accounts.module';

import { StudentProfilesModule } from './student-profiles/student-profiles.module';

import { StudentCareerInterestsModule } from './student-career-interests/student-career-interests.module';

import { MediaFilesModule } from './media-files/media-files.module';

import { CoursesModule } from './courses/courses.module';

import { CourseGroupAssignmentsModule } from './course-group-assignments/course-group-assignments.module';

import { CourseLearningOutcomesModule } from './course-learning-outcomes/course-learning-outcomes.module';

import { CourseRequirementsModule } from './course-requirements/course-requirements.module';

import { CourseTargetLearnersModule } from './course-target-learners/course-target-learners.module';

import { SectionsModule } from './sections/sections.module';

import { LecturesModule } from './lectures/lectures.module';

import { LectureContentVideosModule } from './lecture-content-videos/lecture-content-videos.module';

import { LectureContentArticlesModule } from './lecture-content-articles/lecture-content-articles.module';

import { LectureContentDocumentsModule } from './lecture-content-documents/lecture-content-documents.module';

import { LectureContentQuizzesModule } from './lecture-content-quizzes/lecture-content-quizzes.module';

import { QuizQuestionsModule } from './quiz-questions/quiz-questions.module';

import { QuizAnswerOptionsModule } from './quiz-answer-options/quiz-answer-options.module';

import { LectureContentReflectionsModule } from './lecture-content-reflections/lecture-content-reflections.module';

import { ReflectionQuestionsModule } from './reflection-questions/reflection-questions.module';

import { EnrollmentsModule } from './enrollments/enrollments.module';

import { LectureProgressesModule } from './lecture-progresses/lecture-progresses.module';

import { QuizAttemptsModule } from './quiz-attempts/quiz-attempts.module';

import { QuizAttemptAnswersModule } from './quiz-attempt-answers/quiz-attempt-answers.module';

import { QuizSavesModule } from './quiz-saves/quiz-saves.module';

import { ReflectionResponsesModule } from './reflection-responses/reflection-responses.module';

import { CertificatesModule } from './certificates/certificates.module';

import { CourseRatingsModule } from './course-ratings/course-ratings.module';

import { CareerReflectionQuestionsModule } from './career-reflection-questions/career-reflection-questions.module';

import { CareerReflectionAnswersModule } from './career-reflection-answers/career-reflection-answers.module';

import { AuthorizationModule } from './authorization/authorization.module';

import { RolesAdminModule } from './roles-admin/roles-admin.module';

import { MasterDataAdminModule } from './master-data-admin/master-data-admin.module';

import { YoutubeModule } from './youtube/youtube.module';

import { CoursesAdminModule } from './courses-admin/courses-admin.module';

import { InstructorsModule } from './instructors/instructors.module';

import { CourseInstructorsModule } from './course-instructors/course-instructors.module';

import { InstructorExpertisesModule } from './instructor-expertises/instructor-expertises.module';

import { InstructorSocialLinksModule } from './instructor-social-links/instructor-social-links.module';

import { InstructorsAdminModule } from './instructors-admin/instructors-admin.module';

import { LocalesModule } from './locales/locales.module';

import { LearningModule } from './learning/learning.module';

import { CourseCatalogModule } from './course-catalog/course-catalog.module';

import { MasterDataStartupSeedModule } from './database/seeds/relational/startup/master-data-startup-seed.module';

import { ApiLoggerMiddleware } from './utils/api-logger.middleware';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LocaleContextMiddleware } from './utils/i18n/locale-context.middleware';
import { UserLocaleInterceptor } from './utils/i18n/user-locale.interceptor';

@Module({
  imports: [
    MasterDataStartupSeedModule,
    AuthorizationModule,
    RolesAdminModule,
    MasterDataAdminModule,
    YoutubeModule,
    CoursesAdminModule,
    InstructorsModule,
    CourseInstructorsModule,
    InstructorExpertisesModule,
    InstructorSocialLinksModule,
    InstructorsAdminModule,
    LocalesModule,
    LearningModule,

    CourseCatalogModule,
    CareerReflectionAnswersModule,
    CareerReflectionQuestionsModule,
    CourseRatingsModule,
    CertificatesModule,
    ReflectionResponsesModule,
    QuizSavesModule,
    QuizAttemptAnswersModule,
    QuizAttemptsModule,
    LectureProgressesModule,
    EnrollmentsModule,
    ReflectionQuestionsModule,
    LectureContentReflectionsModule,
    QuizAnswerOptionsModule,
    QuizQuestionsModule,
    LectureContentQuizzesModule,
    LectureContentDocumentsModule,
    LectureContentArticlesModule,
    LectureContentVideosModule,
    LecturesModule,
    SectionsModule,
    CourseTargetLearnersModule,
    CourseRequirementsModule,
    CourseLearningOutcomesModule,
    CourseGroupAssignmentsModule,
    CoursesModule,
    MediaFilesModule,
    StudentCareerInterestsModule,
    StudentProfilesModule,
    OauthAccountsModule,
    MasterDataCodesModule,
    MasterDataGroupsModule,
    UserRolesModule,
    RolePermissionsModule,
    PermissionsModule,
    ModulesModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        authConfig,
        appConfig,
        mailConfig,
        fileConfig,
        facebookConfig,
        googleConfig,
        learningConfig,
        certificateConfig,
      ],
      envFilePath: envFilePaths,
    }),
    infrastructureDatabaseModule,
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        fallbackLanguage: configService.getOrThrow('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: { path: path.join(__dirname, '/i18n/'), watch: true },
      }),
      resolvers: [
        {
          use: HeaderResolver,
          useFactory: (configService: ConfigService<AllConfigType>) => {
            return [
              configService.get('app.headerLanguage', {
                infer: true,
              }),
            ];
          },
          inject: [ConfigService],
        },
      ],
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    UsersModule,
    FilesModule,
    AuthModule,
    AuthFacebookModule,
    AuthGoogleModule,
    SessionModule,
    MailModule,
    MailerModule,
    HomeModule,
  ],
  providers: [
    // Epic 6: completes the locale resolution chain with users.locale and
    // stamps Content-Language / Vary on every response.
    {
      provide: APP_INTERCEPTOR,
      useClass: UserLocaleInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  configure(consumer: MiddlewareConsumer): void {
    // Opens the per-request locale scope before any guard or handler runs, so
    // the static entity mappers can localize without threading a parameter
    // through every service. Registered unconditionally.
    consumer.apply(LocaleContextMiddleware).forRoutes('{*splat}');

    const nodeEnv = this.configService.get('app.nodeEnv', { infer: true });

    // Request logging is a development aid only — never registered in
    // production or during test runs.
    if (nodeEnv !== 'development') {
      return;
    }

    // path-to-regexp v8 (Express 5 / Nest 11) rejects a bare '*' wildcard.
    consumer.apply(ApiLoggerMiddleware).forRoutes('{*splat}');
  }
}
