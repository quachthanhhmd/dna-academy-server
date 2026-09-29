import { Module } from '@nestjs/common';
import { FormQuestionService } from './form-question.service';
import { RelationalFormQuestionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [RelationalFormQuestionPersistenceModule],
  providers: [FormQuestionService],
  exports: [FormQuestionService],
})
export class FormQuestionModule {}
