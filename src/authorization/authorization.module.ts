import { Module } from '@nestjs/common';
import { UserRolesModule } from '../user-roles/user-roles.module';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [UserRolesModule, RolePermissionsModule],
  providers: [PermissionGuard],
  // Re-export these so any module that only imports AuthorizationModule
  // still has PermissionGuard's own dependencies visible to Nest's DI.
  exports: [PermissionGuard, UserRolesModule, RolePermissionsModule],
})
export class AuthorizationModule {}
