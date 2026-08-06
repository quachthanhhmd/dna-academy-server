import { LecturesModule } from '../lectures/lectures.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { LectureContentArticlesService } from './lecture-content-articles.service';
import { LectureContentArticlesController } from './lecture-content-articles.controller';
import { RelationalLectureContentArticlePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    LecturesModule,

    // do not remove this comment
    RelationalLectureContentArticlePersistenceModule,
  ],
  controllers: [LectureContentArticlesController],
  providers: [LectureContentArticlesService],
  exports: [
    LectureContentArticlesService,
    RelationalLectureContentArticlePersistenceModule,
  ],
})
export class LectureContentArticlesModule {}
