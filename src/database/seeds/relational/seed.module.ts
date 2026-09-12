import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DataSource, DataSourceOptions } from 'typeorm';
import { TypeOrmConfigService } from '../../typeorm-config.service';
import { RoleSeedModule } from './role/role-seed.module';
import { StatusSeedModule } from './status/status-seed.module';
import { UserSeedModule } from './user/user-seed.module';
import { ModuleSeedModule } from './module/module-seed.module';
import { PermissionSeedModule } from './permission/permission-seed.module';
import { RolePermissionSeedModule } from './role-permission/role-permission-seed.module';
import { MasterDataGroupSeedModule } from './master-data-group/master-data-group-seed.module';
import { MasterDataCodeSeedModule } from './master-data-code/master-data-code-seed.module';
import { SuperAdminSeedModule } from './super-admin/super-admin-seed.module';
import { InstructorSeedModule } from './instructor/instructor-seed.module';
import databaseConfig from '../../config/database.config';
import appConfig from '../../../config/app.config';
import { envFilePaths } from '../../../config/env-files';

@Module({
  imports: [
    RoleSeedModule,
    StatusSeedModule,
    UserSeedModule,
    ModuleSeedModule,
    PermissionSeedModule,
    RolePermissionSeedModule,
    MasterDataGroupSeedModule,
    MasterDataCodeSeedModule,
    SuperAdminSeedModule,
    InstructorSeedModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: envFilePaths,
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        return new DataSource(options).initialize();
      },
    }),
  ],
})
export class SeedModule {}
