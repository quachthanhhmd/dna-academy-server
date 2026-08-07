import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PermissionSeedService } from './permission-seed.service';
import { PermissionEntity } from '../../../../permissions/infrastructure/persistence/relational/entities/permission.entity';
import { ModuleEntity } from '../../../../modules/infrastructure/persistence/relational/entities/module.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PermissionEntity, ModuleEntity])],
  providers: [PermissionSeedService],
  exports: [PermissionSeedService],
})
export class PermissionSeedModule {}
