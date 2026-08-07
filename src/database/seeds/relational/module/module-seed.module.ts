import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ModuleSeedService } from './module-seed.service';
import { ModuleEntity } from '../../../../modules/infrastructure/persistence/relational/entities/module.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ModuleEntity])],
  providers: [ModuleSeedService],
  exports: [ModuleSeedService],
})
export class ModuleSeedModule {}
