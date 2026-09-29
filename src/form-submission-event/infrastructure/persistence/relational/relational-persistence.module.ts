import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormSubmissionEventRepository } from '../form-submission-event.repository';
import { FormSubmissionEventRelationalRepository } from './repositories/form-submission-event.repository';
import { FormSubmissionEventEntity } from './entities/form-submission-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FormSubmissionEventEntity])],
  providers: [
    {
      provide: FormSubmissionEventRepository,
      useClass: FormSubmissionEventRelationalRepository,
    },
  ],
  exports: [FormSubmissionEventRepository],
})
export class RelationalFormSubmissionEventPersistenceModule {}
