import { LecturesModule } from '../lectures/lectures.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { LectureContentDocumentsService } from './lecture-content-documents.service';
import { RelationalLectureContentDocumentPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    LecturesModule,

    // do not remove this comment
    RelationalLectureContentDocumentPersistenceModule,
  ],
  providers: [LectureContentDocumentsService],
  exports: [
    LectureContentDocumentsService,
    RelationalLectureContentDocumentPersistenceModule,
  ],
})
export class LectureContentDocumentsModule {}
