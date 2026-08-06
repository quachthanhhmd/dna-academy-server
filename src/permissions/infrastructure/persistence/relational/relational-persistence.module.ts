import { Module } from '@nestjs/common';
import { PermissionRepository } from '../permission.repository';
import { PermissionRelationalRepository } from './repositories/permission.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from './entities/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PermissionEntity])],
  providers: [
    {
      provide: PermissionRepository,
      useClass: PermissionRelationalRepository,
    },
  ],
  exports: [PermissionRepository],
})
export class RelationalPermissionPersistenceModule {}
