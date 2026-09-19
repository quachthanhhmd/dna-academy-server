import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { UserRolesModule } from '../user-roles/user-roles.module';
import { SessionModule } from '../session/session.module';
import { UsersAdminController } from './users-admin.controller';
import { UsersAdminService } from './users-admin.service';

/**
 * `/users` — the Students screen. Apart from UsersModule so that UsersModule,
 * which AuthorizationModule's dependencies build on, never has to import the
 * guard.
 */
@Module({
  imports: [UsersModule, AuthorizationModule, UserRolesModule, SessionModule],
  controllers: [UsersAdminController],
  providers: [UsersAdminService],
})
export class UsersAdminModule {}
