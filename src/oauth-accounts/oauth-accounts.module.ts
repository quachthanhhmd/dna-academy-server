import { UsersModule } from '../users/users.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { OauthAccountsService } from './oauth-accounts.service';
import { OauthAccountsController } from './oauth-accounts.controller';
import { RelationalOauthAccountPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    UsersModule,

    // do not remove this comment
    RelationalOauthAccountPersistenceModule,
  ],
  controllers: [OauthAccountsController],
  providers: [OauthAccountsService],
  exports: [OauthAccountsService, RelationalOauthAccountPersistenceModule],
})
export class OauthAccountsModule {}
