import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { LecturesModule } from '../lectures/lectures.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { LectureRatingResponsesService } from './lecture-rating-responses.service';
import { RelationalLectureRatingResponsePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    EnrollmentsModule,

    LecturesModule,

    // do not remove this comment
    RelationalLectureRatingResponsePersistenceModule,
  ],
  providers: [LectureRatingResponsesService],
  exports: [
    LectureRatingResponsesService,
    RelationalLectureRatingResponsePersistenceModule,
  ],
})
export class LectureRatingResponsesModule {}
