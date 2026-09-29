import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FormDefinitionSeedService } from './form-definition-seed.service';
import { FormDefinitionEntity } from '../../../../form-definition/infrastructure/persistence/relational/entities/form-definition.entity';
import { FormQuestionEntity } from '../../../../form-question/infrastructure/persistence/relational/entities/form-question.entity';
import { FormQuestionOptionEntity } from '../../../../form-question-option/infrastructure/persistence/relational/entities/form-question-option.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormDefinitionEntity,
      FormQuestionEntity,
      FormQuestionOptionEntity,
    ]),
  ],
  providers: [FormDefinitionSeedService],
  exports: [FormDefinitionSeedService],
})
export class FormDefinitionSeedModule {}
