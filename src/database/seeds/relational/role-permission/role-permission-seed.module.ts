import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolePermissionSeedService } from './role-permission-seed.service';
import { RolePermissionEntity } from '../../../../role-permissions/infrastructure/persistence/relational/entities/role-permission.entity';
import { PermissionEntity } from '../../../../permissions/infrastructure/persistence/relational/entities/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RolePermissionEntity, PermissionEntity])],
  providers: [RolePermissionSeedService],
  exports: [RolePermissionSeedService],
})
export class RolePermissionSeedModule {}
