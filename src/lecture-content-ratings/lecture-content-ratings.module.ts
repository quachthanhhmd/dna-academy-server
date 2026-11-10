import { LecturesModule } from '../lectures/lectures.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { LectureContentRatingsService } from './lecture-content-ratings.service';
import { RelationalLectureContentRatingPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    LecturesModule,

    // do not remove this comment
    RelationalLectureContentRatingPersistenceModule,
  ],
  providers: [LectureContentRatingsService],
  exports: [
    LectureContentRatingsService,
    RelationalLectureContentRatingPersistenceModule,
  ],
})
export class LectureContentRatingsModule {}
