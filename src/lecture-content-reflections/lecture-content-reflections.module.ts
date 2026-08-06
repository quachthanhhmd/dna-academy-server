import { LecturesModule } from '../lectures/lectures.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { LectureContentReflectionsService } from './lecture-content-reflections.service';
import { LectureContentReflectionsController } from './lecture-content-reflections.controller';
import { RelationalLectureContentReflectionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    LecturesModule,

    // do not remove this comment
    RelationalLectureContentReflectionPersistenceModule,
  ],
  controllers: [LectureContentReflectionsController],
  providers: [LectureContentReflectionsService],
  exports: [
    LectureContentReflectionsService,
    RelationalLectureContentReflectionPersistenceModule,
  ],
})
export class LectureContentReflectionsModule {}
