import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormSubmissionRepository } from '../form-submission.repository';
import { FormSubmissionRelationalRepository } from './repositories/form-submission.repository';
import { FormSubmissionEntity } from './entities/form-submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FormSubmissionEntity])],
  providers: [
    {
      provide: FormSubmissionRepository,
      useClass: FormSubmissionRelationalRepository,
    },
  ],
  exports: [FormSubmissionRepository],
})
export class RelationalFormSubmissionPersistenceModule {}
