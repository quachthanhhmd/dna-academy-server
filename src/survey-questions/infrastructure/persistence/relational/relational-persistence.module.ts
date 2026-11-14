import { Module } from '@nestjs/common';
import { SurveyQuestionRepository } from '../survey-question.repository';
import { SurveyQuestionRelationalRepository } from './repositories/survey-question.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyQuestionEntity } from './entities/survey-question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SurveyQuestionEntity])],
  providers: [
    {
      provide: SurveyQuestionRepository,
      useClass: SurveyQuestionRelationalRepository,
    },
  ],
  exports: [SurveyQuestionRepository],
})
export class RelationalSurveyQuestionPersistenceModule {}
