import { SurveyQuestionOptionsModule } from '../survey-question-options/survey-question-options.module';
import { SurveyQuestionsModule } from '../survey-questions/survey-questions.module';
import { SurveyResponsesModule } from '../survey-responses/survey-responses.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { SurveyAnswersService } from './survey-answers.service';
import { RelationalSurveyAnswerPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    SurveyQuestionOptionsModule,

    SurveyQuestionsModule,

    SurveyResponsesModule,

    // do not remove this comment
    RelationalSurveyAnswerPersistenceModule,
  ],
  providers: [SurveyAnswersService],
  exports: [SurveyAnswersService, RelationalSurveyAnswerPersistenceModule],
})
export class SurveyAnswersModule {}
