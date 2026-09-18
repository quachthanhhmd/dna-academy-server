import { CoursesModule } from '../courses/courses.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CareerReflectionQuestionsService } from './career-reflection-questions.service';
import { CareerReflectionQuestionsAdminController } from './career-reflection-questions-admin.controller';
import { RelationalCareerReflectionQuestionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // PermissionGuard is applied via @UseGuards on this module's controller,
    // so Nest builds it here and needs its own dependencies in scope.
    AuthorizationModule,
    CoursesModule,

    // do not remove this comment
    RelationalCareerReflectionQuestionPersistenceModule,
  ],
  // Epic 4.1 D5 — the only authoring surface. The generated CRUD that sat
  // beside it put the global question bank behind `courses:edit`, which
  // instructors hold; it was removed by the permission model (§1.10).
  controllers: [CareerReflectionQuestionsAdminController],
  providers: [CareerReflectionQuestionsService],
  exports: [
    CareerReflectionQuestionsService,
    RelationalCareerReflectionQuestionPersistenceModule,
  ],
})
export class CareerReflectionQuestionsModule {}
