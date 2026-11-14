import { SurveyQuestionsModule } from '../survey-questions/survey-questions.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { SurveyQuestionOptionsService } from './survey-question-options.service';
import { RelationalSurveyQuestionOptionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    SurveyQuestionsModule,

    // do not remove this comment
    RelationalSurveyQuestionOptionPersistenceModule,
  ],
  providers: [SurveyQuestionOptionsService],
  exports: [
    SurveyQuestionOptionsService,
    RelationalSurveyQuestionOptionPersistenceModule,
  ],
})
export class SurveyQuestionOptionsModule {}
