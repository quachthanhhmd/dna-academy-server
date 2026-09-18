import { LecturesModule } from '../lectures/lectures.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ReflectionQuestionsService } from './reflection-questions.service';
import { RelationalReflectionQuestionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // PermissionGuard is applied via @UseGuards on this module's controller,
    // so Nest builds it here and needs its own dependencies in scope.
    AuthorizationModule,
    LecturesModule,

    // do not remove this comment
    RelationalReflectionQuestionPersistenceModule,
  ],
  providers: [ReflectionQuestionsService],
  exports: [
    ReflectionQuestionsService,
    RelationalReflectionQuestionPersistenceModule,
  ],
})
export class ReflectionQuestionsModule {}
