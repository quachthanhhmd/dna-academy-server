import { LecturesModule } from '../lectures/lectures.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { QuizSavesService } from './quiz-saves.service';
import { RelationalQuizSavePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // PermissionGuard is applied via @UseGuards on this module's controller,
    // so Nest builds it here and needs its own dependencies in scope.
    AuthorizationModule,
    LecturesModule,

    EnrollmentsModule,

    // do not remove this comment
    RelationalQuizSavePersistenceModule,
  ],
  providers: [QuizSavesService],
  exports: [QuizSavesService, RelationalQuizSavePersistenceModule],
})
export class QuizSavesModule {}
