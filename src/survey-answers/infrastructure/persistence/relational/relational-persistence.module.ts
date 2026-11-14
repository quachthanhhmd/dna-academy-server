import { Module } from '@nestjs/common';
import { SurveyAnswerRepository } from '../survey-answer.repository';
import { SurveyAnswerRelationalRepository } from './repositories/survey-answer.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyAnswerEntity } from './entities/survey-answer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SurveyAnswerEntity])],
  providers: [
    {
      provide: SurveyAnswerRepository,
      useClass: SurveyAnswerRelationalRepository,
    },
  ],
  exports: [SurveyAnswerRepository],
})
export class RelationalSurveyAnswerPersistenceModule {}
