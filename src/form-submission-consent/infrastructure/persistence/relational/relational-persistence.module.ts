import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormSubmissionConsentRepository } from '../form-submission-consent.repository';
import { FormSubmissionConsentRelationalRepository } from './repositories/form-submission-consent.repository';
import { FormSubmissionConsentEntity } from './entities/form-submission-consent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FormSubmissionConsentEntity])],
  providers: [
    {
      provide: FormSubmissionConsentRepository,
      useClass: FormSubmissionConsentRelationalRepository,
    },
  ],
  exports: [FormSubmissionConsentRepository],
})
export class RelationalFormSubmissionConsentPersistenceModule {}
