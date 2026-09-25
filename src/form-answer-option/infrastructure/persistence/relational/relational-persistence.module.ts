import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormAnswerOptionRepository } from '../form-answer-option.repository';
import { FormAnswerOptionRelationalRepository } from './repositories/form-answer-option.repository';
import { FormAnswerOptionEntity } from './entities/form-answer-option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FormAnswerOptionEntity])],
  providers: [
    {
      provide: FormAnswerOptionRepository,
      useClass: FormAnswerOptionRelationalRepository,
    },
  ],
  exports: [FormAnswerOptionRepository],
})
export class RelationalFormAnswerOptionPersistenceModule {}
