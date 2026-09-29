import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormQuestionRepository } from '../form-question.repository';
import { FormQuestionRelationalRepository } from './repositories/form-question.repository';
import { FormQuestionEntity } from './entities/form-question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FormQuestionEntity])],
  providers: [
    {
      provide: FormQuestionRepository,
      useClass: FormQuestionRelationalRepository,
    },
  ],
  exports: [FormQuestionRepository],
})
export class RelationalFormQuestionPersistenceModule {}
