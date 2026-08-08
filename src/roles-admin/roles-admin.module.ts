import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { UserRolesModule } from '../user-roles/user-roles.module';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { RolesAdminController } from './roles-admin.controller';
import { RolesAdminService } from './roles-admin.service';
import { UserRolesAdminController } from './user-roles-admin.controller';
import { UserRolesAdminService } from './user-roles-admin.service';

@Module({
  imports: [
    RolesModule,
    UserRolesModule,
    RolePermissionsModule,
    PermissionsModule,
    UsersModule,
    AuthorizationModule,
  ],
  controllers: [RolesAdminController, UserRolesAdminController],
  providers: [RolesAdminService, UserRolesAdminService],
})
export class RolesAdminModule {}
