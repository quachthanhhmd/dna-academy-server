import { LecturesModule } from '../lectures/lectures.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { LectureContentVideosService } from './lecture-content-videos.service';
import { LectureContentVideosController } from './lecture-content-videos.controller';
import { RelationalLectureContentVideoPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    LecturesModule,

    // do not remove this comment
    RelationalLectureContentVideoPersistenceModule,
  ],
  controllers: [LectureContentVideosController],
  providers: [LectureContentVideosService],
  exports: [
    LectureContentVideosService,
    RelationalLectureContentVideoPersistenceModule,
  ],
})
export class LectureContentVideosModule {}
