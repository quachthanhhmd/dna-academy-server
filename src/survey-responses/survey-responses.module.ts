import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { LecturesModule } from '../lectures/lectures.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { SurveyResponsesService } from './survey-responses.service';
import { RelationalSurveyResponsePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    EnrollmentsModule,

    LecturesModule,

    // do not remove this comment
    RelationalSurveyResponsePersistenceModule,
  ],
  providers: [SurveyResponsesService],
  exports: [SurveyResponsesService, RelationalSurveyResponsePersistenceModule],
})
export class SurveyResponsesModule {}
