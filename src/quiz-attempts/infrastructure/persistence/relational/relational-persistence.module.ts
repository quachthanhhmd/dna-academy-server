import { Module } from '@nestjs/common';
import { QuizAttemptRepository } from '../quiz-attempt.repository';
import { QuizAttemptRelationalRepository } from './repositories/quiz-attempt.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizAttemptEntity } from './entities/quiz-attempt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuizAttemptEntity])],
  providers: [
    {
      provide: QuizAttemptRepository,
      useClass: QuizAttemptRelationalRepository,
    },
  ],
  exports: [QuizAttemptRepository],
})
export class RelationalQuizAttemptPersistenceModule {}
