import {
  RateLimit,
  RateLimitGuard,
} from '../utils/rate-limit/rate-limit.guard';
import { HOUR, MINUTE } from '../utils/rate-limit/rate-limit.constants';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Request,
  Post,
  UseGuards,
  Patch,
  Delete,
  SerializeOptions,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { AuthForgotPasswordDto } from './dto/auth-forgot-password.dto';
import { AuthConfirmEmailDto } from './dto/auth-confirm-email.dto';
import { AuthResendVerificationEmailDto } from './dto/auth-resend-verification-email.dto';
import { AuthResetPasswordDto } from './dto/auth-reset-password.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { NullableType } from '../utils/types/nullable.type';
import { User } from '../users/domain/user';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { AuthOnboardingDto } from './dto/auth-onboarding.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateLocaleDto } from './dto/update-locale.dto';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @ApiOperation({
    summary: 'Log in with email + password',
    description:
      'Returns a JWT pair and the current user. `requiresOnboarding: true` means the FE should redirect to /onboarding.',
  })
  @SerializeOptions({
    groups: ['me'],
  })
  // Per IP: spraying many accounts from one address. Per email: failed
  // attempts are counted in AuthService (10 / 15 min), which sees the result.
  @UseGuards(RateLimitGuard)
  @RateLimit(100, 15 * MINUTE, 'ip')
  @Post('email/login')
  @ApiOkResponse({
    type: LoginResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Email not found, wrong provider, or incorrect password',
  })
  @HttpCode(HttpStatus.OK)
  public login(@Body() loginDto: AuthEmailLoginDto): Promise<LoginResponseDto> {
    return this.service.validateLogin(loginDto);
  }

  @ApiOperation({
    summary: 'Register a new student account with email + password',
    description:
      'Creates the user (inactive) and a linked student_profiles row, then sends a verification email. Confirm via POST /auth/email/confirm.',
  })
  @UseGuards(RateLimitGuard)
  @RateLimit(60, HOUR, 'ip')
  @Post('email/register')
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(@Body() createUserDto: AuthRegisterLoginDto): Promise<void> {
    return this.service.register(createUserDto);
  }

  @ApiOperation({
    summary: 'Confirm email address via the token sent by /auth/email/register',
  })
  @Post('email/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmEmail(
    @Body() confirmEmailDto: AuthConfirmEmailDto,
  ): Promise<void> {
    return this.service.confirmEmail(confirmEmailDto.hash);
  }

  @Post('email/confirm/new')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmNewEmail(
    @Body() confirmEmailDto: AuthConfirmEmailDto,
  ): Promise<void> {
    return this.service.confirmNewEmail(confirmEmailDto.hash);
  }

  @ApiOperation({
    summary: 'Resend the sign-up verification email',
    description:
      'For accounts stuck unverified (e.g. the original email from /auth/email/register never arrived). Issues a new confirmation token and re-sends the same email as register. Returns 422 if the account is already confirmed.',
  })
  @UseGuards(RateLimitGuard)
  @RateLimit(3, HOUR, { body: 'email' })
  @RateLimit(20, HOUR, 'ip')
  @Post('email/confirm/resend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiUnprocessableEntityResponse({
    description: 'Email not found, or the account is already confirmed',
  })
  async resendVerificationEmail(
    @Body() resendVerificationEmailDto: AuthResendVerificationEmailDto,
  ): Promise<void> {
    return this.service.resendVerificationEmail(
      resendVerificationEmailDto.email,
    );
  }

  @UseGuards(RateLimitGuard)
  @RateLimit(3, HOUR, { body: 'email' })
  @RateLimit(20, HOUR, 'ip')
  @Post('forgot/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(
    @Body() forgotPasswordDto: AuthForgotPasswordDto,
  ): Promise<void> {
    return this.service.forgotPassword(forgotPasswordDto.email);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit(20, 15 * MINUTE, 'ip')
  @Post('reset/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() resetPasswordDto: AuthResetPasswordDto): Promise<void> {
    return this.service.resetPassword(
      resetPasswordDto.hash,
      resetPasswordDto.password,
    );
  }

  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({
    type: User,
  })
  @HttpCode(HttpStatus.OK)
  public me(@Request() request): Promise<NullableType<User>> {
    return this.service.me(request.user);
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    type: RefreshResponseDto,
  })
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  public refresh(@Request() request): Promise<RefreshResponseDto> {
    return this.service.refreshToken({
      sessionId: request.user.sessionId,
      hash: request.user.hash,
    });
  }

  @ApiBearerAuth()
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(@Request() request): Promise<void> {
    await this.service.logout({
      sessionId: request.user.sessionId,
    });
  }

  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Patch('me')
  // Changing the password checks the old one: bound the guesses a stolen
  // access token can make.
  @UseGuards(AuthGuard('jwt'), RateLimitGuard)
  @RateLimit(20, 15 * MINUTE)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: User,
  })
  public update(
    @Request() request,
    @Body() userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    return this.service.update(request.user, userDto);
  }

  @ApiBearerAuth()
  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  public async delete(@Request() request): Promise<void> {
    return this.service.softDelete(request.user);
  }

  @ApiOperation({
    summary: 'Get current user + student profile + career interests',
    description:
      'Use this to pre-populate the /onboarding form (full_name, email, profile_picture) and to check `user.onboardingDone`.',
  })
  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Get('profile/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({
    type: ProfileResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  public getProfile(@Request() request): Promise<ProfileResponseDto> {
    return this.service.getProfile(request.user.id);
  }

  @ApiOperation({
    summary: 'Set the current user preferred UI locale',
    description:
      'Epic 6 §2.2.3. Persists `users.locale`, which feeds the locale ' +
      'resolution chain whenever a request carries no ?locale= or X-Locale.',
  })
  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Patch('me/locale')
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'unsupportedLocale' })
  @HttpCode(HttpStatus.OK)
  public updateLocale(
    @Request() request,
    @Body() dto: UpdateLocaleDto,
  ): Promise<ProfileResponseDto> {
    return this.service.updateLocale(request.user.id, dto.locale);
  }

  @ApiOperation({
    summary: 'Complete student onboarding',
    description:
      'Sets education stage, age/date of birth, and career interests (with optional custom interest for "Other"). Marks users.onboarding_done = true.',
  })
  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Patch('profile/onboarding')
  @UseGuards(AuthGuard('jwt'))
  @ApiOkResponse({
    type: ProfileResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Invalid educationStageCodeId/careerInterestIds, or neither age nor dateOfBirth provided/known',
  })
  @HttpCode(HttpStatus.OK)
  public completeOnboarding(
    @Request() request,
    @Body() onboardingDto: AuthOnboardingDto,
  ): Promise<ProfileResponseDto> {
    return this.service.completeOnboarding(request.user.id, onboardingDto);
  }
}
