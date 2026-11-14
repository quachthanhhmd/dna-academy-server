import { Module } from '@nestjs/common';
import { SurveyResponseRepository } from '../survey-response.repository';
import { SurveyResponseRelationalRepository } from './repositories/survey-response.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyResponseEntity } from './entities/survey-response.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SurveyResponseEntity])],
  providers: [
    {
      provide: SurveyResponseRepository,
      useClass: SurveyResponseRelationalRepository,
    },
  ],
  exports: [SurveyResponseRepository],
})
export class RelationalSurveyResponsePersistenceModule {}
