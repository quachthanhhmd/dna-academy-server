import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AnonymousStrategy } from './strategies/anonymous.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { MailModule } from '../mail/mail.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { OauthAccountsModule } from '../oauth-accounts/oauth-accounts.module';
import { StudentProfilesModule } from '../student-profiles/student-profiles.module';
import { StudentCareerInterestsModule } from '../student-career-interests/student-career-interests.module';
import { MasterDataCodesModule } from '../master-data-codes/master-data-codes.module';
import { OnboardingGuard } from './guards/onboarding.guard';
import { UserRolesModule } from '../user-roles/user-roles.module';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [
    UsersModule,
    SessionModule,
    PassportModule,
    MailModule,
    JwtModule.register({}),
    OauthAccountsModule,
    StudentProfilesModule,
    StudentCareerInterestsModule,
    MasterDataCodesModule,
    // Social login checks whether an account holds admin-panel permissions
    // before linking it by email.
    UserRolesModule,
    RolePermissionsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    AnonymousStrategy,
    OnboardingGuard,
    OnboardingService,
  ],
  // Re-export UsersModule so any module that only imports AuthModule to use
  // OnboardingGuard still has the guard's own dependency visible to Nest's DI
  // (guards applied via @UseGuards are instantiated in the consumer's context).
  exports: [AuthService, OnboardingGuard, UsersModule],
})
export class AuthModule {}
