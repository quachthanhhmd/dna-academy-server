import { Module } from '@nestjs/common';
import { FormAnswerOptionService } from './form-answer-option.service';
import { RelationalFormAnswerOptionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [RelationalFormAnswerOptionPersistenceModule],
  providers: [FormAnswerOptionService],
  exports: [FormAnswerOptionService],
})
export class FormAnswerOptionModule {}
