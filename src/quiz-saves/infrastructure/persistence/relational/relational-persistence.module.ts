import { Module } from '@nestjs/common';
import { QuizSaveRepository } from '../quiz-save.repository';
import { QuizSaveRelationalRepository } from './repositories/quiz-save.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizSaveEntity } from './entities/quiz-save.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuizSaveEntity])],
  providers: [
    {
      provide: QuizSaveRepository,
      useClass: QuizSaveRelationalRepository,
    },
  ],
  exports: [QuizSaveRepository],
})
export class RelationalQuizSavePersistenceModule {}
