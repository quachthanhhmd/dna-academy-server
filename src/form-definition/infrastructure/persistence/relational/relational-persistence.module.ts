import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormDefinitionRepository } from '../form-definition.repository';
import { FormDefinitionRelationalRepository } from './repositories/form-definition.repository';
import { FormDefinitionEntity } from './entities/form-definition.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FormDefinitionEntity])],
  providers: [
    {
      provide: FormDefinitionRepository,
      useClass: FormDefinitionRelationalRepository,
    },
  ],
  exports: [FormDefinitionRepository],
})
export class RelationalFormDefinitionPersistenceModule {}
