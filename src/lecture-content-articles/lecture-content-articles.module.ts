import { LecturesModule } from '../lectures/lectures.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { LectureContentArticlesService } from './lecture-content-articles.service';
import { RelationalLectureContentArticlePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    LecturesModule,

    // do not remove this comment
    RelationalLectureContentArticlePersistenceModule,
  ],
  providers: [LectureContentArticlesService],
  exports: [
    LectureContentArticlesService,
    RelationalLectureContentArticlePersistenceModule,
  ],
})
export class LectureContentArticlesModule {}
