import { CoursesModule } from '../courses/courses.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CareerReflectionQuestionsService } from './career-reflection-questions.service';
import { CareerReflectionQuestionsController } from './career-reflection-questions.controller';
import { RelationalCareerReflectionQuestionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CoursesModule,

    // do not remove this comment
    RelationalCareerReflectionQuestionPersistenceModule,
  ],
  controllers: [CareerReflectionQuestionsController],
  providers: [CareerReflectionQuestionsService],
  exports: [
    CareerReflectionQuestionsService,
    RelationalCareerReflectionQuestionPersistenceModule,
  ],
})
export class CareerReflectionQuestionsModule {}
