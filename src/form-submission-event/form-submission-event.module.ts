import { Module } from '@nestjs/common';
import { FormSubmissionEventService } from './form-submission-event.service';
import { RelationalFormSubmissionEventPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [RelationalFormSubmissionEventPersistenceModule],
  providers: [FormSubmissionEventService],
  exports: [FormSubmissionEventService],
})
export class FormSubmissionEventModule {}
