import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { MasterDataCodesModule } from '../master-data-codes/master-data-codes.module';
import { UsersModule } from '../users/users.module';
import { FormsRepository } from './infrastructure/persistence/relational/forms.repository';
import { FormDefinitionEntity } from '../form-definition/infrastructure/persistence/relational/entities/form-definition.entity';
import { FormQuestionEntity } from '../form-question/infrastructure/persistence/relational/entities/form-question.entity';
import { FormQuestionOptionEntity } from '../form-question-option/infrastructure/persistence/relational/entities/form-question-option.entity';
import { FormSubmissionEntity } from '../form-submission/infrastructure/persistence/relational/entities/form-submission.entity';
import { FormAnswerEntity } from '../form-answer/infrastructure/persistence/relational/entities/form-answer.entity';
import { FormAnswerOptionEntity } from '../form-answer-option/infrastructure/persistence/relational/entities/form-answer-option.entity';
import { FormSubmissionConsentEntity } from '../form-submission-consent/infrastructure/persistence/relational/entities/form-submission-consent.entity';
import { FormSubmissionEventEntity } from '../form-submission-event/infrastructure/persistence/relational/entities/form-submission-event.entity';
import { FormsService } from './forms.service';
import { FormsAnalyticsService } from './forms-analytics.service';
import { FormsAnalyticsExportService } from './forms-analytics-export.service';
import { FormsPublicController } from './forms-public.controller';
import { FormsAdminController } from './forms-admin.controller';

/**
 * The EPIC-08 forms API. The eight generated resources provide entities,
 * mappers and CRUD-by-id; this module is the only surface over them — the
 * public definition/submission routes and the admin submissions API. None of
 * the eight resource modules is imported here: their services are not used,
 * and importing them would expose CRUD nothing calls.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormDefinitionEntity,
      FormQuestionEntity,
      FormQuestionOptionEntity,
      FormSubmissionEntity,
      FormAnswerEntity,
      FormAnswerOptionEntity,
      FormSubmissionConsentEntity,
      FormSubmissionEventEntity,
    ]),
    MasterDataCodesModule,
    UsersModule,
    AuthorizationModule,
  ],
  controllers: [FormsPublicController, FormsAdminController],
  providers: [
    FormsRepository,
    FormsService,
    FormsAnalyticsService,
    FormsAnalyticsExportService,
  ],
  exports: [FormsService],
})
export class FormsModule {}
