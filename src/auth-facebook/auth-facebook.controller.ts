import {
  RateLimit,
  RateLimitGuard,
} from '../utils/rate-limit/rate-limit.guard';
import { MINUTE } from '../utils/rate-limit/rate-limit.constants';
import { AuthProvidersEnum } from '../auth/auth-providers.enum';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { AuthFacebookService } from './auth-facebook.service';
import { AuthFacebookLoginDto } from './dto/auth-facebook-login.dto';
import { LoginResponseDto } from '../auth/dto/login-response.dto';

@ApiTags('Auth')
@Controller({
  path: 'auth/facebook',
  version: '1',
})
export class AuthFacebookController {
  constructor(
    private readonly authService: AuthService,
    private readonly authFacebookService: AuthFacebookService,
  ) {}

  @ApiOperation({
    summary: 'Register or sign in with Facebook',
    description:
      'Send the Facebook SDK access token. Looks up oauth_accounts by (provider=facebook, provider_uid); creates a new user + oauth_accounts link on first login. Returns `requiresOnboarding: true` when the linked user has not finished onboarding — the FE should redirect to /onboarding.',
  })
  @ApiOkResponse({
    type: LoginResponseDto,
  })
  @SerializeOptions({
    groups: ['me'],
  })
  // Each call reaches the provider's API; bound what one address can spend.
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 15 * MINUTE, 'ip')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: AuthFacebookLoginDto,
  ): Promise<LoginResponseDto> {
    const socialData =
      await this.authFacebookService.getProfileByToken(loginDto);

    return this.authService.validateSocialLogin(
      AuthProvidersEnum.facebook,
      socialData,
    );
  }
}
