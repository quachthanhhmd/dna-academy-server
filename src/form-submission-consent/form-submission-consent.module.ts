import { Module } from '@nestjs/common';
import { FormSubmissionConsentService } from './form-submission-consent.service';
import { RelationalFormSubmissionConsentPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [RelationalFormSubmissionConsentPersistenceModule],
  providers: [FormSubmissionConsentService],
  exports: [FormSubmissionConsentService],
})
export class FormSubmissionConsentModule {}
