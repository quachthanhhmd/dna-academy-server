import { CareerReflectionQuestionsModule } from '../career-reflection-questions/career-reflection-questions.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CareerReflectionAnswersService } from './career-reflection-answers.service';
import { RelationalCareerReflectionAnswerPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // PermissionGuard is applied via @UseGuards on this module's controller,
    // so Nest builds it here and needs its own dependencies in scope.
    AuthorizationModule,
    CareerReflectionQuestionsModule,

    EnrollmentsModule,

    // do not remove this comment
    RelationalCareerReflectionAnswerPersistenceModule,
  ],
  providers: [CareerReflectionAnswersService],
  exports: [
    CareerReflectionAnswersService,
    RelationalCareerReflectionAnswerPersistenceModule,
  ],
})
export class CareerReflectionAnswersModule {}
