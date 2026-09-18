import { SectionsModule } from '../sections/sections.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { LecturesService } from './lectures.service';
import { RelationalLecturePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    SectionsModule,

    // do not remove this comment
    RelationalLecturePersistenceModule,
  ],
  providers: [LecturesService],
  exports: [LecturesService, RelationalLecturePersistenceModule],
})
export class LecturesModule {}
