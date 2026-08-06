import { Module } from '@nestjs/common';
import { ReflectionQuestionRepository } from '../reflection-question.repository';
import { ReflectionQuestionRelationalRepository } from './repositories/reflection-question.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReflectionQuestionEntity } from './entities/reflection-question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReflectionQuestionEntity])],
  providers: [
    {
      provide: ReflectionQuestionRepository,
      useClass: ReflectionQuestionRelationalRepository,
    },
  ],
  exports: [ReflectionQuestionRepository],
})
export class RelationalReflectionQuestionPersistenceModule {}
