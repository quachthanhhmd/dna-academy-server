import { Module } from '@nestjs/common';
import { FormSubmissionService } from './form-submission.service';
import { RelationalFormSubmissionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [RelationalFormSubmissionPersistenceModule],
  providers: [FormSubmissionService],
  exports: [FormSubmissionService],
})
export class FormSubmissionModule {}
