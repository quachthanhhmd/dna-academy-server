import { Module } from '@nestjs/common';
import { CareerReflectionAnswerRepository } from '../career-reflection-answer.repository';
import { CareerReflectionAnswerRelationalRepository } from './repositories/career-reflection-answer.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareerReflectionAnswerEntity } from './entities/career-reflection-answer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CareerReflectionAnswerEntity])],
  providers: [
    {
      provide: CareerReflectionAnswerRepository,
      useClass: CareerReflectionAnswerRelationalRepository,
    },
  ],
  exports: [CareerReflectionAnswerRepository],
})
export class RelationalCareerReflectionAnswerPersistenceModule {}
