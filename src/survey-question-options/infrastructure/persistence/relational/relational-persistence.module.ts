import { Module } from '@nestjs/common';
import { SurveyQuestionOptionRepository } from '../survey-question-option.repository';
import { SurveyQuestionOptionRelationalRepository } from './repositories/survey-question-option.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyQuestionOptionEntity } from './entities/survey-question-option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SurveyQuestionOptionEntity])],
  providers: [
    {
      provide: SurveyQuestionOptionRepository,
      useClass: SurveyQuestionOptionRelationalRepository,
    },
  ],
  exports: [SurveyQuestionOptionRepository],
})
export class RelationalSurveyQuestionOptionPersistenceModule {}
