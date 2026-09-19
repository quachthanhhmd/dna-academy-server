import { LecturesModule } from '../lectures/lectures.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { LectureContentQuizzesService } from './lecture-content-quizzes.service';
import { RelationalLectureContentQuizPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    LecturesModule,

    // do not remove this comment
    RelationalLectureContentQuizPersistenceModule,
  ],
  providers: [LectureContentQuizzesService],
  exports: [
    LectureContentQuizzesService,
    RelationalLectureContentQuizPersistenceModule,
  ],
})
export class LectureContentQuizzesModule {}
