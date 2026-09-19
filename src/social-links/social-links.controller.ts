import {
  RateLimit,
  RateLimitGuard,
} from '../utils/rate-limit/rate-limit.guard';
import { MINUTE } from '../utils/rate-limit/rate-limit.constants';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SocialLinksService } from './social-links.service';

class StepUpDto {
  @ApiPropertyOptional({
    description:
      "The account's current password. Required when the account has one " +
      '(`hasPassword`); 422 `password: required | incorrectPassword`.',
  })
  @IsOptional()
  @IsString()
  password?: string;
}

export class LinkFacebookDto extends StepUpDto {
  @ApiProperty({ example: 'EAAB…' })
  @IsNotEmpty()
  @IsString()
  accessToken: string;
}

export class LinkGoogleDto extends StepUpDto {
  @ApiProperty({ example: 'eyJ…' })
  @IsNotEmpty()
  @IsString()
  idToken: string;
}

class SocialLinkResponseDto {
  @ApiProperty({ enum: ['facebook', 'google'] })
  provider: string;

  @ApiProperty()
  linkedAt: Date;
}

class SocialLinksResponseDto {
  @ApiProperty({ type: () => [SocialLinkResponseDto] })
  links: SocialLinkResponseDto[];

  @ApiProperty()
  hasPassword: boolean;
}

const PROVIDERS = ['facebook', 'google'];

/** Permission model §1.4 — linked sign-in providers on the caller's account. */
@ApiTags('Auth')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'auth/me/social-links', version: '1' })
export class SocialLinksController {
  constructor(private readonly socialLinksService: SocialLinksService) {}

  @Get()
  @ApiOkResponse({ type: SocialLinksResponseDto })
  list(@Request() request): Promise<SocialLinksResponseDto> {
    return this.socialLinksService.list(request.user.id);
  }

  @ApiOperation({ summary: 'Link a Facebook account' })
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 15 * MINUTE)
  @Post('facebook')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: SocialLinkResponseDto })
  @ApiConflictResponse({
    description: 'social_identity_in_use | provider_already_linked',
  })
  linkFacebook(@Body() dto: LinkFacebookDto, @Request() request) {
    return this.socialLinksService.link(request.user.id, 'facebook', {
      token: dto.accessToken,
      password: dto.password,
    });
  }

  @ApiOperation({ summary: 'Link a Google account' })
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 15 * MINUTE)
  @Post('google')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: SocialLinkResponseDto })
  @ApiConflictResponse({
    description: 'social_identity_in_use | provider_already_linked',
  })
  linkGoogle(@Body() dto: LinkGoogleDto, @Request() request) {
    return this.socialLinksService.link(request.user.id, 'google', {
      token: dto.idToken,
      password: dto.password,
    });
  }

  @ApiOperation({
    summary: 'Unlink a provider',
    description:
      '409 last_login_method when the account would be left with no password and no link.',
  })
  @Delete(':provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'last_login_method' })
  async unlink(
    @Param('provider') provider: string,
    @Request() request,
  ): Promise<void> {
    if (!PROVIDERS.includes(provider)) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'linkNotFound',
      });
    }

    await this.socialLinksService.unlink(request.user.id, provider);
  }
}
