import { LecturesModule } from '../lectures/lectures.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { QuizSavesService } from './quiz-saves.service';
import { QuizSavesController } from './quiz-saves.controller';
import { RelationalQuizSavePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    LecturesModule,

    EnrollmentsModule,

    // do not remove this comment
    RelationalQuizSavePersistenceModule,
  ],
  controllers: [QuizSavesController],
  providers: [QuizSavesService],
  exports: [QuizSavesService, RelationalQuizSavePersistenceModule],
})
export class QuizSavesModule {}
