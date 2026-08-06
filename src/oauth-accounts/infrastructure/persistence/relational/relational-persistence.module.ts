import { Module } from '@nestjs/common';
import { OauthAccountRepository } from '../oauth-account.repository';
import { OauthAccountRelationalRepository } from './repositories/oauth-account.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OauthAccountEntity } from './entities/oauth-account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OauthAccountEntity])],
  providers: [
    {
      provide: OauthAccountRepository,
      useClass: OauthAccountRelationalRepository,
    },
  ],
  exports: [OauthAccountRepository],
})
export class RelationalOauthAccountPersistenceModule {}
