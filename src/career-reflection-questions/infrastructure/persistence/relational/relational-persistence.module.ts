import { Module } from '@nestjs/common';
import { CareerReflectionQuestionRepository } from '../career-reflection-question.repository';
import { CareerReflectionQuestionRelationalRepository } from './repositories/career-reflection-question.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareerReflectionQuestionEntity } from './entities/career-reflection-question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CareerReflectionQuestionEntity])],
  providers: [
    {
      provide: CareerReflectionQuestionRepository,
      useClass: CareerReflectionQuestionRelationalRepository,
    },
  ],
  exports: [CareerReflectionQuestionRepository],
})
export class RelationalCareerReflectionQuestionPersistenceModule {}
