import { UsersModule } from '../users/users.module';
import { MediaFilesModule } from '../media-files/media-files.module';
import { QuizAnswerOptionsModule } from '../quiz-answer-options/quiz-answer-options.module';
import { QuizQuestionsModule } from '../quiz-questions/quiz-questions.module';
import { QuizAttemptsModule } from '../quiz-attempts/quiz-attempts.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { QuizAttemptAnswersService } from './quiz-attempt-answers.service';
import { QuizAttemptAnswersController } from './quiz-attempt-answers.controller';
import { RelationalQuizAttemptAnswerPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // PermissionGuard is applied via @UseGuards on this module's controller,
    // so Nest builds it here and needs its own dependencies in scope.
    AuthorizationModule,
    UsersModule,

    MediaFilesModule,

    QuizAnswerOptionsModule,

    QuizQuestionsModule,

    QuizAttemptsModule,

    // do not remove this comment
    RelationalQuizAttemptAnswerPersistenceModule,
  ],
  controllers: [QuizAttemptAnswersController],
  providers: [QuizAttemptAnswersService],
  exports: [
    QuizAttemptAnswersService,
    RelationalQuizAttemptAnswerPersistenceModule,
  ],
})
export class QuizAttemptAnswersModule {}
