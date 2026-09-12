import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { RelationalUserRolePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    RolesModule,

    UsersModule,

    // do not remove this comment
    RelationalUserRolePersistenceModule,
  ],
  // No controller on purpose. The generated CRUD at /api/v1/user-roles let any
  // logged-in user POST themselves the Super Admin role. Role assignment lives
  // on PUT /api/v1/admin/users/:id/roles, behind PermissionGuard. Guarding it
  // here instead would need AuthorizationModule, which imports this module.
  providers: [UserRolesService],
  exports: [UserRolesService, RelationalUserRolePersistenceModule],
})
export class UserRolesModule {}
