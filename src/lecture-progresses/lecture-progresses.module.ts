import { LecturesModule } from '../lectures/lectures.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { LectureProgressesService } from './lecture-progresses.service';
import { LectureProgressesController } from './lecture-progresses.controller';
import { RelationalLectureProgressPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    LecturesModule,

    EnrollmentsModule,

    // do not remove this comment
    RelationalLectureProgressPersistenceModule,
  ],
  controllers: [LectureProgressesController],
  providers: [LectureProgressesService],
  exports: [
    LectureProgressesService,
    RelationalLectureProgressPersistenceModule,
  ],
})
export class LectureProgressesModule {}
