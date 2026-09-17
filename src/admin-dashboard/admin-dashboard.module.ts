import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareerReflectionAnswerEntity } from '../career-reflection-answers/infrastructure/persistence/relational/entities/career-reflection-answer.entity';
import { CareerReflectionQuestionEntity } from '../career-reflection-questions/infrastructure/persistence/relational/entities/career-reflection-question.entity';
import { CourseRatingEntity } from '../course-ratings/infrastructure/persistence/relational/entities/course-rating.entity';
import { EnrollmentEntity } from '../enrollments/infrastructure/persistence/relational/entities/enrollment.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { ChartsService } from './services/charts.service';
import { CsvService } from './services/csv.service';
import { ExportDatasetService } from './services/export-dataset.service';
import { PdfModule } from '../pdf/pdf.module';
import { KpisService } from './services/kpis.service';
import { MetricsQueryService } from './services/metrics-query.service';
import { ReflectionService } from './services/reflection.service';
import { StudentsService } from './services/students.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EnrollmentEntity,
      UserEntity,
      CourseRatingEntity,
      CareerReflectionAnswerEntity,
      CareerReflectionQuestionEntity,
    ]),
    AuthorizationModule,
    // One Chromium per process, shared with the certificate download.
    PdfModule,
  ],
  controllers: [AdminDashboardController],
  providers: [
    MetricsQueryService,
    KpisService,
    ChartsService,
    ReflectionService,
    StudentsService,
    ExportDatasetService,
    CsvService,
  ],
})
export class AdminDashboardModule {}
