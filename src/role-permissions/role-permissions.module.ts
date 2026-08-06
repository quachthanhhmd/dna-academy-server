import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { RolePermissionsService } from './role-permissions.service';
import { RolePermissionsController } from './role-permissions.controller';
import { RelationalRolePermissionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    PermissionsModule,

    RolesModule,

    // do not remove this comment
    RelationalRolePermissionPersistenceModule,
  ],
  controllers: [RolePermissionsController],
  providers: [RolePermissionsService],
  exports: [RolePermissionsService, RelationalRolePermissionPersistenceModule],
})
export class RolePermissionsModule {}
