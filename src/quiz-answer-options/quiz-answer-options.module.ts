import { QuizQuestionsModule } from '../quiz-questions/quiz-questions.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { QuizAnswerOptionsService } from './quiz-answer-options.service';
import { QuizAnswerOptionsController } from './quiz-answer-options.controller';
import { RelationalQuizAnswerOptionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // PermissionGuard is applied via @UseGuards on this module's controller,
    // so Nest builds it here and needs its own dependencies in scope.
    AuthorizationModule,
    QuizQuestionsModule,

    // do not remove this comment
    RelationalQuizAnswerOptionPersistenceModule,
  ],
  controllers: [QuizAnswerOptionsController],
  providers: [QuizAnswerOptionsService],
  exports: [
    QuizAnswerOptionsService,
    RelationalQuizAnswerOptionPersistenceModule,
  ],
})
export class QuizAnswerOptionsModule {}
