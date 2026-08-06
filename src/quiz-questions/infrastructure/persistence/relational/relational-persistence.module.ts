import { Module } from '@nestjs/common';
import { QuizQuestionRepository } from '../quiz-question.repository';
import { QuizQuestionRelationalRepository } from './repositories/quiz-question.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizQuestionEntity } from './entities/quiz-question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuizQuestionEntity])],
  providers: [
    {
      provide: QuizQuestionRepository,
      useClass: QuizQuestionRelationalRepository,
    },
  ],
  exports: [QuizQuestionRepository],
})
export class RelationalQuizQuestionPersistenceModule {}
