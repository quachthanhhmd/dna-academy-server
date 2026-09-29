import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormQuestionOptionRepository } from '../form-question-option.repository';
import { FormQuestionOptionRelationalRepository } from './repositories/form-question-option.repository';
import { FormQuestionOptionEntity } from './entities/form-question-option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FormQuestionOptionEntity])],
  providers: [
    {
      provide: FormQuestionOptionRepository,
      useClass: FormQuestionOptionRelationalRepository,
    },
  ],
  exports: [FormQuestionOptionRepository],
})
export class RelationalFormQuestionOptionPersistenceModule {}
