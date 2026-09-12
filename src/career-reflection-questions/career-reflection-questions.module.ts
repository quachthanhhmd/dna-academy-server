import { CoursesModule } from '../courses/courses.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CareerReflectionQuestionsService } from './career-reflection-questions.service';
import { CareerReflectionQuestionsController } from './career-reflection-questions.controller';
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
  controllers: [
    CareerReflectionQuestionsController,
    // Epic 4.1 D5 — the supported authoring surface. The generated CRUD above
    // stays for now; removing it is what would free the public read from its
    // `/grouped` suffix, and §7 Q5 schedules that deliberately.
    CareerReflectionQuestionsAdminController,
  ],
  providers: [CareerReflectionQuestionsService],
  exports: [
    CareerReflectionQuestionsService,
    RelationalCareerReflectionQuestionPersistenceModule,
  ],
})
export class CareerReflectionQuestionsModule {}
