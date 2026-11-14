import { LecturesModule } from '../lectures/lectures.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { SurveyQuestionsService } from './survey-questions.service';
import { RelationalSurveyQuestionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    LecturesModule,

    // do not remove this comment
    RelationalSurveyQuestionPersistenceModule,
  ],
  providers: [SurveyQuestionsService],
  exports: [SurveyQuestionsService, RelationalSurveyQuestionPersistenceModule],
})
export class SurveyQuestionsModule {}
