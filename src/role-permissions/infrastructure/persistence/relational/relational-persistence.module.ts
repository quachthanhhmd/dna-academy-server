import { Module } from '@nestjs/common';
import { RolePermissionRepository } from '../role-permission.repository';
import { RolePermissionRelationalRepository } from './repositories/role-permission.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermissionEntity } from './entities/role-permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RolePermissionEntity])],
  providers: [
    {
      provide: RolePermissionRepository,
      useClass: RolePermissionRelationalRepository,
    },
  ],
  exports: [RolePermissionRepository],
})
export class RelationalRolePermissionPersistenceModule {}
