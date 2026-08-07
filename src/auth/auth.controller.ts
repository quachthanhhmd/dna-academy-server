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

  @Post('forgot/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(
    @Body() forgotPasswordDto: AuthForgotPasswordDto,
  ): Promise<void> {
    return this.service.forgotPassword(forgotPasswordDto.email);
  }

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
  @UseGuards(AuthGuard('jwt'))
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
