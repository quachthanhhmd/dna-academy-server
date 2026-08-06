import { CareerReflectionQuestionsModule } from '../career-reflection-questions/career-reflection-questions.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CareerReflectionAnswersService } from './career-reflection-answers.service';
import { CareerReflectionAnswersController } from './career-reflection-answers.controller';
import { RelationalCareerReflectionAnswerPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CareerReflectionQuestionsModule,

    EnrollmentsModule,

    // do not remove this comment
    RelationalCareerReflectionAnswerPersistenceModule,
  ],
  controllers: [CareerReflectionAnswersController],
  providers: [CareerReflectionAnswersService],
  exports: [
    CareerReflectionAnswersService,
    RelationalCareerReflectionAnswerPersistenceModule,
  ],
})
export class CareerReflectionAnswersModule {}
