import { UsersModule } from '../users/users.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { OauthAccountsService } from './oauth-accounts.service';
import { RelationalOauthAccountPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    UsersModule,

    // do not remove this comment
    RelationalOauthAccountPersistenceModule,
  ],
  // No controller on purpose. A social link decides who a social login signs
  // in as, and the generated CRUD at /api/v1/oauth-accounts let any logged-in
  // user create one pointing at any account — an admin's included — and list
  // every user's provider tokens. Links are written only by the login flow in
  // AuthService. Same reasoning as UserRolesModule.
  providers: [OauthAccountsService],
  exports: [OauthAccountsService, RelationalOauthAccountPersistenceModule],
})
export class OauthAccountsModule {}
