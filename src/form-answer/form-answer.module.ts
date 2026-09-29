import { Module } from '@nestjs/common';
import { FormAnswerService } from './form-answer.service';
import { RelationalFormAnswerPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [RelationalFormAnswerPersistenceModule],
  providers: [FormAnswerService],
  exports: [FormAnswerService],
})
export class FormAnswerModule {}
