import { Module } from '@nestjs/common';
import { UserRolesModule } from '../user-roles/user-roles.module';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { PermissionGuard } from './permission.guard';
import { AuthorizationService } from './authorization.service';
import { MePermissionsController } from './me-permissions.controller';

@Module({
  imports: [UserRolesModule, RolePermissionsModule],
  controllers: [MePermissionsController],
  providers: [PermissionGuard, AuthorizationService],
  // Re-export these so any module that only imports AuthorizationModule
  // still has PermissionGuard's own dependencies visible to Nest's DI.
  exports: [
    PermissionGuard,
    AuthorizationService,
    UserRolesModule,
    RolePermissionsModule,
  ],
})
export class AuthorizationModule {}
