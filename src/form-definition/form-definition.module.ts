import { Module } from '@nestjs/common';
import { FormDefinitionService } from './form-definition.service';
import { RelationalFormDefinitionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [RelationalFormDefinitionPersistenceModule],
  providers: [FormDefinitionService],
  exports: [FormDefinitionService],
})
export class FormDefinitionModule {}
