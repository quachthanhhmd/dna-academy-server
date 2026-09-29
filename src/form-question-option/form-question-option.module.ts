import { Module } from '@nestjs/common';
import { FormQuestionOptionService } from './form-question-option.service';
import { RelationalFormQuestionOptionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [RelationalFormQuestionOptionPersistenceModule],
  providers: [FormQuestionOptionService],
  exports: [FormQuestionOptionService],
})
export class FormQuestionOptionModule {}
