import { Module } from '@nestjs/common';
import { QuizAttemptAnswerRepository } from '../quiz-attempt-answer.repository';
import { QuizAttemptAnswerRelationalRepository } from './repositories/quiz-attempt-answer.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizAttemptAnswerEntity } from './entities/quiz-attempt-answer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuizAttemptAnswerEntity])],
  providers: [
    {
      provide: QuizAttemptAnswerRepository,
      useClass: QuizAttemptAnswerRelationalRepository,
    },
  ],
  exports: [QuizAttemptAnswerRepository],
})
export class RelationalQuizAttemptAnswerPersistenceModule {}
