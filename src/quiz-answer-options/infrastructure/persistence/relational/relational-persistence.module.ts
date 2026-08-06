import { Module } from '@nestjs/common';
import { QuizAnswerOptionRepository } from '../quiz-answer-option.repository';
import { QuizAnswerOptionRelationalRepository } from './repositories/quiz-answer-option.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizAnswerOptionEntity } from './entities/quiz-answer-option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuizAnswerOptionEntity])],
  providers: [
    {
      provide: QuizAnswerOptionRepository,
      useClass: QuizAnswerOptionRelationalRepository,
    },
  ],
  exports: [QuizAnswerOptionRepository],
})
export class RelationalQuizAnswerOptionPersistenceModule {}
