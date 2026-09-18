import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { OauthAccountsModule } from '../oauth-accounts/oauth-accounts.module';
import { AuthFacebookModule } from '../auth-facebook/auth-facebook.module';
import { AuthGoogleModule } from '../auth-google/auth-google.module';
import { SocialLinksController } from './social-links.controller';
import { SocialLinksService } from './social-links.service';

@Module({
  imports: [
    UsersModule,
    OauthAccountsModule,
    AuthFacebookModule,
    AuthGoogleModule,
  ],
  controllers: [SocialLinksController],
  providers: [SocialLinksService],
})
export class SocialLinksModule {}
