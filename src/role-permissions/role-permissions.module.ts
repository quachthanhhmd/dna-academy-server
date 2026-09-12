import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { RolePermissionsService } from './role-permissions.service';
import { RelationalRolePermissionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    PermissionsModule,

    RolesModule,

    // do not remove this comment
    RelationalRolePermissionPersistenceModule,
  ],
  // No controller on purpose — same reason as UserRolesModule. Granting a
  // permission to a role lives on PUT /api/v1/admin/roles/:id/permissions,
  // behind PermissionGuard.
  providers: [RolePermissionsService],
  exports: [RolePermissionsService, RelationalRolePermissionPersistenceModule],
})
export class RolePermissionsModule {}
